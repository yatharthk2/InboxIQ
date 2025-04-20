import asyncio
import os
import json
import logging
from typing import Any, Dict, List, Optional, Tuple, Union

import aiohttp
import groq
from dotenv import load_dotenv

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp import types as mcp_types

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("mcp-groq-client")

# Load environment variables
load_dotenv()

# Configure Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is required in environment variables")

groq_client = groq.Client(api_key=GROQ_API_KEY)

# Configure MCP connection to email server
email_server_params = StdioServerParameters(
    command="python",
    args=["email_server.py"],
    env=os.environ.copy(),  # Pass current environment variables
)

SYSTEM_PROMPT = """
You are an Email Assistant, a helpful AI that can interact with a user's email account.
You can search emails, read email content, count emails, and send emails.

Available tools:
- search-emails: Search emails within a date range or with specific keywords
- get-email-content: Get the full content of a specific email by ID
- count-daily-emails: Count emails received for each day in a date range
- send-email: Send an email (ONLY after confirmation from the user)

IMPORTANT: 
1. For sending emails, ALWAYS first show the user what the email will contain and ask for confirmation.
2. Only call the send-email function AFTER receiving explicit confirmation.
3. Be concise but helpful in your responses.
4. Format your responses in a clear, readable way.

Example tasks you can help with:
- "Find emails from last week about project updates"
- "Show me the content of email 42"
- "How many emails did I receive last week?"
- "Draft an email to bob@example.com about the project deadline"
"""

# Function to convert MCP tools to Groq function definitions
def convert_tools_to_groq_functions(tools: List[mcp_types.Tool]) -> List[Dict[str, Any]]:
    """Convert MCP tools to Groq function definitions with improved error handling."""
    groq_functions = []
    
    for tool in tools:
        try:
            logger.debug(f"Processing tool: {tool.name}")
            
            # Default empty parameters schema
            parameters = {
                "type": "object",
                "properties": {},
                "required": []
            }
            
            # Check if inputSchema is available and is a dictionary
            if hasattr(tool, "inputSchema") and tool.inputSchema:
                logger.debug(f"Tool {tool.name} has inputSchema")
                parameters = tool.inputSchema
            else:
                logger.debug(f"Tool {tool.name} has no inputSchema, using default")
            
            # Ensure the schema has the correct structure for Groq
            if "type" not in parameters:
                parameters["type"] = "object"
            
            if "properties" not in parameters:
                parameters["properties"] = {}
            
            # Create the function definition - adding 'type': 'function' as required by Groq API
            function_def = {
                "type": "function",  # Required by Groq API
                "function": {
                    "name": tool.name,
                    "description": tool.description if hasattr(tool, "description") else "",
                    "parameters": parameters
                }
            }
            
            logger.debug(f"Created function definition for {tool.name}")
            groq_functions.append(function_def)
            
        except Exception as e:
            logger.error(f"Error processing tool {tool.name if hasattr(tool, 'name') else 'unknown'}: {str(e)}")
            # Continue with other tools even if one fails
    
    return groq_functions

async def handle_conversation(session: ClientSession):
    """Main conversation loop between user and Groq LLM using MCP tools."""
    
    # List available tools from MCP server
    logger.info("Fetching available tools from MCP server...")
    try:
        # Fetch tools and properly access the tools list
        tools_result = await session.list_tools()
        
        # Debug the tools_result structure
        logger.debug(f"Tools result type: {type(tools_result)}")
        logger.debug(f"Tools result dir: {dir(tools_result)}")
        
        # Extract tools from the ListToolsResult object
        # The tools are directly available in the tools_result
        mcp_tools = tools_result.tools if hasattr(tools_result, 'tools') else tools_result
        
        # Count tools properly
        tool_count = len(mcp_tools) if isinstance(mcp_tools, list) else 0
        logger.info(f"Successfully fetched {tool_count} tools from MCP server")
        
        # Log each tool name for debugging
        for tool in mcp_tools:
            logger.debug(f"Found tool: {tool.name}")
        
        # Convert MCP tools to Groq function definitions
        groq_functions = convert_tools_to_groq_functions(mcp_tools)
        logger.info(f"Converted {len(groq_functions)} tools to Groq function definitions")
        
    except Exception as e:
        logger.error(f"Error fetching tools: {str(e)}", exc_info=True)
        print(f"\nError connecting to email server: {str(e)}")
        return

    # Initialize conversation history
    conversation = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Main conversation loop
    print("\nEmail Assistant is ready! Type 'exit' to quit.")
    print("-------------------------------------------")
    
    while True:
        # Get user input
        user_input = input("\nYou: ")
        if user_input.lower() in ('exit', 'quit', 'bye'):
            print("Goodbye!")
            break
        
        # Add user message to conversation history
        conversation.append({"role": "user", "content": user_input})
        
        try:
            # Call Groq API with the conversation history and function definitions
            print("\nProcessing...")
            response = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=conversation,
                tools=groq_functions,  # Tools are now properly formatted
                temperature=0.7,
                max_tokens=1024
            )
            
            # Process response
            assistant_message = response.choices[0].message
            
            # Check if the assistant wants to call a tool function
            if hasattr(assistant_message, "tool_calls") and assistant_message.tool_calls:
                for tool_call in assistant_message.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    print(f"Assistant is calling tool: {function_name}")
                    logger.info(f"Executing tool: {function_name} with args: {function_args}")
                    
                    # Execute the function call via MCP
                    try:
                        tool_result = await session.call_tool(function_name, arguments=function_args)
                        logger.debug(f"Tool result type: {type(tool_result)}")
                        
                        # Convert tool result to text for the conversation - more robust handling
                        tool_response = ""
                        
                        # Handle different possible return formats
                        if isinstance(tool_result, str):
                            # Direct string response
                            tool_response = tool_result
                        elif isinstance(tool_result, (list, tuple)):
                            # Process list/tuple of content items
                            for content in tool_result:
                                # Handle content based on its type
                                if isinstance(content, dict) and 'type' in content and content['type'] == 'text':
                                    # Dict with 'type' and 'text' fields
                                    tool_response += content['text']
                                elif hasattr(content, 'type') and content.type == 'text' and hasattr(content, 'text'):
                                    # Object with type and text attributes
                                    tool_response += content.text
                                elif isinstance(content, tuple) and len(content) == 2:
                                    # Tuple format (type, text)
                                    content_type, content_text = content
                                    if content_type == 'text':
                                        tool_response += content_text
                                else:
                                    # Fall back to string representation
                                    tool_response += str(content)
                        else:
                            # Fall back to string representation for unknown formats
                            tool_response = str(tool_result)
                        
                        logger.info(f"Tool response: {tool_response}")
                        
                        # Add the function call and result to the conversation history
                        conversation.append({
                            "role": "assistant",
                            "content": None,
                            "tool_calls": [
                                {
                                    "id": tool_call.id,
                                    "type": "function",
                                    "function": {
                                        "name": function_name,
                                        "arguments": tool_call.function.arguments
                                    }
                                }
                            ]
                        })
                        conversation.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": tool_response
                        })
                        
                        logger.info(f"Tool {function_name} executed successfully")
                    except Exception as e:
                        error_msg = f"Error executing tool {function_name}: {str(e)}"
                        logger.error(error_msg)
                        conversation.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": f"Error: {str(e)}"
                        })
                
                # Get the assistant's response to the function results
                response = groq_client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=conversation,
                    tools=groq_functions,
                    temperature=0.7,
                    max_tokens=1024
                )
                
                assistant_message = response.choices[0].message
            
            # Display the assistant's message
            if assistant_message.content:
                conversation.append({
                    "role": "assistant",
                    "content": assistant_message.content
                })
                
                print(f"\nAssistant: {assistant_message.content}")
            else:
                print("\nAssistant: [No text response, only tool calls]")
                
        except Exception as e:
            error_message = f"Error: {str(e)}"
            print(f"\nAssistant: {error_message}")
            logger.error(error_message, exc_info=True)  # Include traceback

async def main():
    """Main entry point for the MCP-Groq client."""
    try:
        logger.info("Starting MCP-Groq client...")
        logger.info(f"Connecting to email server...")
        
        # Connect to the MCP email server
        async with stdio_client(email_server_params) as (read, write):
            async with ClientSession(read, write) as session:
                # Initialize the connection
                await session.initialize()
                logger.info("Connected to MCP email server successfully")
                
                # Start the conversation handler
                await handle_conversation(session)
                
    except Exception as e:
        logger.error(f"Error in main: {str(e)}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main())
