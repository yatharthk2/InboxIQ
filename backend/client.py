import asyncio
import json
import logging
import os
import sys
from typing import Optional, List, Dict, Any
from contextlib import AsyncExitStack

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from groq import Groq

# ============================================================
# Logging
# ============================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("document-search-client")

# Disable Groq and httpx loggers
logging.getLogger("groq").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

# ============================================================
# Environment Variables
# ============================================================

GROQ_API_KEY = "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"

if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY is not set in environment variables")
    logger.warning("The client will not be able to process queries with AI")

# ============================================================
# MCP Client
# ============================================================
class MCPClient:
    def __init__(self, debug=False):
        """Initialize the MCP client.
        
        Args:
            debug: Whether to enable debug logging
        """
        # ============================================================
        # Initialize session and client objects
        # ============================================================

        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.debug = debug
        
        # Permission control setting
        self.require_permission = True  # Default to requiring permission
        
        # ============================================================
        # Message history tracking
        # ============================================================

        self.message_history = []
        
        # ============================================================
        # Main System Prompt
        # ============================================================

        self.system_prompt = "You are a helpful RAG AI assistant named 'RAG-AI-MCP' that can answer questions about the provided documents or query the attached database for more information."

        # ============================================================
        # Initialize Groq Client
        # ============================================================
        try:
            self.groq = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
            if not self.groq:
                logger.warning("Groq client not initialized - missing API key")
        
        except Exception as e:
            logger.error(f"Error initializing Groq client: {e}")
            self.groq = None
        
        # ============================================================
        # Server connection info
        # ============================================================

        self.available_tools = []
        self.available_resources = []
        self.available_prompts = []
        self.server_name = None

    def ask_permission(self, action_description: str) -> bool:
        """Ask user for permission before performing an action.
        
        Args:
            action_description: Description of the action to be performed
            
        Returns:
            bool: True if permission granted, False otherwise
        """
        while True:
            response = input(f"The system wants to {action_description}. Do you allow this? (yes/no): ").strip().lower()
            if response in ['yes', 'y']:
                return True
            elif response in ['no', 'n']:
                return False
            else:
                print("Please answer yes or no.")

    # ============================================================
    # Connect to MCP Server
    # ============================================================
    async def connect_to_server(self, server_script_path: str):
        """Connect to an MCP server
        
        Args:
            server_script_path: Path to the server script (.py or .js)
        """
        if self.debug:
            logger.info(f"Connecting to server at {server_script_path}")
            
        # Check for existing Python script
        is_python = server_script_path.endswith('.py')
        if not (is_python):
            raise ValueError("Server script must be a .py file")

        # Initialize server parameters
        server_params = StdioServerParameters(
            command="python",
            args=[server_script_path],
            env=None
        )

        # Initialize stdio transport
        try:
            stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
            self.stdio, self.write = stdio_transport
            self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))
            
            # Initialize the session
            init_result = await self.session.initialize()
            self.server_name = init_result.serverInfo.name
            
            if self.debug:
                logger.info(f"Connected to server: {self.server_name} v{init_result.serverInfo.version}")
            
            # Cache available tools, resources, and prompts
            await self.refresh_capabilities()
            
            return True
        
        except Exception as e:
            logger.error(f"Failed to connect to server: {e}")
            return False
    
    # ============================================================
    # Refresh Server Capabilities
    # ============================================================
    async def refresh_capabilities(self):
        """Refresh the client's knowledge of server capabilities"""
        if not self.session:
            raise ValueError("Not connected to server")
            
        # Get available tools
        tools_response = await self.session.list_tools()
        self.available_tools = tools_response.tools
        
        # Get available resources
        resources_response = await self.session.list_resources()
        self.available_resources = resources_response.resources
        
        # Get available prompts
        prompts_response = await self.session.list_prompts()
        self.available_prompts = prompts_response.prompts
        
        if self.debug:
            logger.info(f"Server capabilities refreshed:")
            logger.info(f"- Tools: {len(self.available_tools)}")
            logger.info(f"- Resources: {len(self.available_resources)}")
            logger.info(f"- Prompts: {len(self.available_prompts)}")

    # ============================================================
    # Handling Message History Helper Function
    # ============================================================
    async def add_to_history(self, role: str, content: str, metadata: Dict[str, Any] = None):
        """Add a message to the history
        
        Args:
            role: The role of the message sender (user, assistant, system, resource)
            content: The message content
            metadata: Optional metadata about the message
        """
        
        # Format message
        message = {
            "role": role,
            "content": content,
            "timestamp": asyncio.get_event_loop().time(),
            "metadata": metadata or {}
        }

        # Add message to history
        self.message_history.append(message)
        
        if self.debug:
            logger.info(f"Added message to history: {role} - {content[:100]}...")

    # ============================================================
    # List Available Resources from the MCP Server
    # ============================================================
    async def list_resources(self):
        """List available resources from the MCP server"""
        if not self.session:
            raise ValueError("Not connected to server")
            
        response = await self.session.list_resources()
        self.available_resources = response.resources
        
        if self.debug:
            resource_uris = [res.uri for res in self.available_resources]
            logger.info(f"Available resources: {resource_uris}")
        
        return self.available_resources

    # ============================================================
    # Read Content from a Resource and Add to Message History
    # ============================================================
    async def read_resource(self, uri: str):
        """Read content from a specific resource
        
        Args:
            uri: The URI of the resource to read
        
        Returns:
            The content of the resource as a string
        """
        # Permission check is now handled in the chat_loop method
        
        if self.debug:
            logger.info(f"Reading resource: {uri}")
            
        try:
            # Read resource content
            result = await self.session.read_resource(uri)
            
            # Check if resource content is found
            if not result:
                content = "No content found for this resource."
            else:
                content = result if isinstance(result, str) else str(result)
            
            # Add resource content to history as a user message
            resource_message = f"Resource content from {uri}:\n\n{content}"
            await self.add_to_history("user", resource_message, {"resource_uri": uri, "is_resource": True})
            
            return content
        
        except Exception as e:
            error_msg = f"Error reading resource {uri}: {str(e)}"
            logger.error(error_msg)
            await self.add_to_history("user", error_msg, {"uri": uri, "error": True})
            return error_msg

    # ============================================================
    # List Available Prompts from the MCP Server
    # ============================================================
    async def list_prompts(self):
        """List available prompts from the MCP server"""
        
        # Get available prompts
        response = await self.session.list_prompts()
        self.available_prompts = response.prompts
        
        if self.debug:
            prompt_names = [prompt.name for prompt in self.available_prompts]
            logger.info(f"Available prompts: {prompt_names}")
        
        return self.available_prompts

    # ============================================================
    # Get a Specific Prompt with Arguments
    # ============================================================
    async def get_prompt(self, name: str, arguments: dict = None):
        """Get a specific prompt with arguments
        
        Args:
            name: The name of the prompt
            arguments: Optional arguments to pass to the prompt
            
        Returns:
            The prompt result
        """
        if not self.ask_permission(f"get prompt '{name}' with arguments {arguments}"):
            error_msg = "Permission denied to get prompt"
            print(error_msg)
            raise ValueError(error_msg)
            
        if self.debug:
            logger.info(f"Getting prompt: {name} with arguments: {arguments}")
            
        try:
            # Get the prompt
            prompt_result = await self.session.get_prompt(name, arguments)
            return prompt_result
        except Exception as e:
            error_msg = f"Error getting prompt {name}: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)

    # ============================================================
    # Permission Request Helper
    # ============================================================
    async def request_permission(self, tool_name: str, tool_args: dict) -> bool:
        """Request permission from the user before executing a tool.
        
        Args:
            tool_name: The name of the tool to execute
            tool_args: The arguments to pass to the tool
            
        Returns:
            True if the user grants permission, False otherwise
        """
        # Skip permission check if requirements are disabled
        if not self.require_permission:
            return True
            
        # Format the args for display
        args_str = json.dumps(tool_args, indent=2)
        
        # Ask for permission
        print(f"\n{'='*60}")
        print(f"PERMISSION REQUEST: Execute tool '{tool_name}'?")
        print(f"Arguments:")
        print(f"{args_str}")
        print(f"{'='*60}")
        
        # Get user response
        response = input("Allow this operation? (y/n): ").strip().lower()
        
        # Return True if the user confirms, False otherwise
        return response in ('y', 'yes')

    # ============================================================
    # Process a Query using Groq and Available Tools
    # ============================================================
    async def process_query(self, query: str, max_tool_calls: int = 5) -> str:
        """Process a query using Groq and available tools
        
        Args:
            query: The query to process
            max_tool_calls: Maximum number of tool call iterations allowed
            
        Returns:
            The response from the AI after processing the query
        """
            
        # Add user query to history
        await self.add_to_history("user", query)
        
        # Initialize tool call counter
        tool_call_count = 0
        
        # Initialize response collection
        final_text = []
        
        # Start the conversation with the user query
        messages = [
            {
                "role": "system",
                "content": self.system_prompt
            },
            {
                "role": "user",
                "content": query
            }
        ]
        
        # Begin the tool loop
        while tool_call_count < max_tool_calls:
            if self.debug:
                logger.info(f"Tool call iteration {tool_call_count + 1}/{max_tool_calls}")
            
            # Make sure we have the latest tools
            if not self.available_tools:
                await self.refresh_capabilities()

            # Format tools for Groq
            available_tools = [{ 
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.inputSchema
                }
            } for tool in self.available_tools]

            # Call Groq API
            try:
                response = self.groq.chat.completions.create(
                    model="llama3-70b-8192",  # Groq's most capable model
                    messages=messages,
                    tools=available_tools,
                    tool_choice="auto"
                )
            except Exception as e:
                error_msg = f"Error calling Groq API: {str(e)}"
                logger.error(error_msg)
                await self.add_to_history("assistant", error_msg, {"error": True})
                return error_msg

            # Get the assistant message
            assistant_message = response.choices[0].message
            response_content = assistant_message.content or ""
            
            # Add assistant's response to history and final output
            tool_calls_metadata = {}
            if hasattr(assistant_message, 'tool_calls') and assistant_message.tool_calls:
                tool_calls_metadata = {
                    "has_tool_calls": True,
                    "tool_calls": assistant_message.tool_calls
                }
            
            await self.add_to_history("assistant", response_content, tool_calls_metadata)
            
            # Add assistant's response to final text if not empty
            if response_content:
                final_text.append(response_content)
            
            # Check if we have any tool calls
            if not hasattr(assistant_message, 'tool_calls') or not assistant_message.tool_calls:
                # No tool calls, we're done
                break
                
            # Add the assistant's message to conversation history
            messages.append({
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": assistant_message.tool_calls
            })
            
            # Process tool calls
            any_tools_executed = False
            
            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = tool_call.function.arguments
                
                # Convert json string to dict if needed
                if isinstance(tool_args, str):
                    try:
                        tool_args = json.loads(tool_args)
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse tool arguments as JSON: {tool_args}")
                        tool_args = {}
                
                # Request permission from the user
                permission_granted = await self.request_permission(tool_name, tool_args)
                
                if not permission_granted:
                    # User denied permission
                    permission_denied_msg = f"Permission denied to execute tool: {tool_name}"
                    logger.info(permission_denied_msg)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": permission_denied_msg
                    })
                    await self.add_to_history("tool", permission_denied_msg, 
                                            {"tool": tool_name, "permission": "denied", "tool_call_id": tool_call.id})
                    final_text.append(f"\n[Permission denied for tool {tool_name}]")
                    continue
                
                # Execute tool call on the server
                try:
                    result = await self.session.call_tool(tool_name, tool_args)
                    tool_content = result.content if hasattr(result, 'content') else str(result)
                    final_text.append(f"\n[Calling tool {tool_name} with args {tool_args}]")
                    
                    # Add the tool result to the conversation
                    tool_result_content = tool_content[0].text if hasattr(tool_content[0], 'text') else str(tool_content[0])
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_result_content
                    })
                    await self.add_to_history("tool", tool_result_content, 
                                             {"tool": tool_name, "args": tool_args, "tool_call_id": tool_call.id})
                    
                    any_tools_executed = True
                    
                except Exception as e:
                    error_msg = f"Error executing tool {tool_name}: {str(e)}"
                    logger.error(error_msg)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": error_msg
                    })
                    await self.add_to_history("tool", error_msg, 
                                             {"tool": tool_name, "error": True, "tool_call_id": tool_call.id})
                    final_text.append(f"\n[Error executing tool {tool_name}: {str(e)}]")
            
            # Increment the tool call counter if any tools were executed
            if any_tools_executed:
                tool_call_count += 1
                
                if tool_call_count >= max_tool_calls:
                    # Add a note that we've reached the maximum number of tool calls
                    max_tool_calls_msg = f"\n[Reached maximum of {max_tool_calls} tool call iterations]"
                    final_text.append(max_tool_calls_msg)
                    if self.debug:
                        logger.info(max_tool_calls_msg)
            else:
                # No tools were executed (all denied permission), so we're done
                break
        
        # Get final summary response if we executed tools
        if tool_call_count > 0:
            try:
                # Add a system message encouraging a final summary
                messages.append({
                    "role": "system",
                    "content": "Please provide a final summary of all the information gathered."
                })
                
                final_response = self.groq.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=messages
                )
                
                summary_content = final_response.choices[0].message.content
                await self.add_to_history("assistant", summary_content)
                final_text.append("\n\n### Final Summary ###\n" + summary_content)
                
            except Exception as e:
                error_msg = f"Error getting final summary: {str(e)}"
                logger.error(error_msg)
                await self.add_to_history("assistant", error_msg, {"error": True})
                final_text.append(f"\n[Error: {error_msg}]")

        return "\n".join(final_text)

    # ============================================================
    # Main Chat Loop
    # ============================================================
    async def chat_loop(self):
        """Welcome to the RAG-AI-MCP Client!"""
        print(f"\n{'='*50}")
        print(f"RAG-AI-MCP Client Connected to: {self.server_name}")
        print(f"{'='*50}")
        print("Type your queries or use these commands:")
        print("  /debug - Toggle debug mode")
        print("  /permissions - Toggle permission requirements")
        print("  /max_tools <number> - Set maximum tool call iterations (default: 5)")
        print("  /refresh - Refresh server capabilities")
        print("  /resources - List available resources")
        print("  /resource <uri> - Read a specific resource")
        print("  /prompts - List available prompts")
        print("  /prompt <name> <argument> - Use a specific prompt with a string as the argument")
        print("  /tools - List available tools")
        print("  /quit - Exit the client")
        print(f"{'='*50}")
        
        # Set default max tool calls
        max_tool_calls = 5
        
        # Main chat loop
        while True:
            try:
                # Get user query
                query = input("\nQuery: ").strip()
                
                # Handle commands
                if query.lower() == '/quit':
                    break

                # Toggle debug mode
                elif query.lower() == '/debug':
                    self.debug = not self.debug
                    print(f"\nDebug mode {'enabled' if self.debug else 'disabled'}")
                    continue
                    
                # Toggle permission requirements
                elif query.lower() == '/permissions':
                    self.require_permission = not self.require_permission
                    print(f"\nPermission requirements {'enabled' if self.require_permission else 'disabled'}")
                    continue
                    
                # Set maximum tool call iterations
                elif query.lower().startswith('/max_tools '):
                    try:
                        max_tool_calls = int(query[10:].strip())
                        if max_tool_calls < 1:
                            print("Maximum tool calls must be at least 1")
                            max_tool_calls = 1
                        print(f"\nMaximum tool call iterations set to: {max_tool_calls}")
                    except ValueError:
                        print("Invalid number. Usage: /max_tools <number>")
                    continue

                # Refresh server capabilities
                elif query.lower() == '/refresh':
                    await self.refresh_capabilities()
                    print("\nServer capabilities refreshed")
                    continue

                # List available resources
                elif query.lower() == '/resources':
                    resources = await self.list_resources()
                    print("\nAvailable Resources:")
                    for res in resources:
                        print(f"  - {res.uri}")
                        if res.description:
                            print(f"    {res.description}")
                    continue

                # Read content from a resource
                elif query.lower().startswith('/resource '):
                    uri = query[10:].strip()
                    print(f"\nResource requested: {uri}")
                    
                    # Request permission if needed
                    if self.require_permission:
                        permission = input(f"Do you want to read resource '{uri}'? (y/n): ").strip().lower()
                        if permission not in ('y', 'yes'):
                            print("Operation cancelled by user")
                            continue
                            
                    print(f"\nFetching resource: {uri}")
                    content = await self.read_resource(uri)
                    print(f"\nResource Content ({uri}):")
                    print("-----------------------------------")
                    # Print first 500 chars with option to see more
                    if len(content) > 500:
                        print(content[:500] + "...")
                        print("(Resource content truncated for display purposes but full content is included in message history)")
                    else:
                        print(content)
                    continue

                # List available prompts
                elif query.lower() == '/prompts':
                    prompts = await self.list_prompts()
                    print("\nAvailable Prompts:")
                    for prompt in prompts:
                        print(f"  - {prompt.name}")
                        if prompt.description:
                            print(f"    {prompt.description}")
                        if prompt.arguments:
                            print(f"    Arguments: {', '.join(arg.name for arg in prompt.arguments)}")
                    continue

                # Run a specific prompt with arguments
                elif query.lower().startswith('/prompt '):
                    # Parse: /prompt name sentence of arguments
                    parts = query[8:].strip().split(maxsplit=1)
                    if not parts:
                        print("Error: Prompt name required")
                        continue
                    
                    name = parts[0]
                    arguments = {}
                    
                    # If there are arguments (anything after the prompt name)
                    if len(parts) > 1:
                        arg_text = parts[1]
                        
                        # Get the prompt to check its expected arguments
                        prompt_info = None
                        for prompt in self.available_prompts:
                            if prompt.name == name:
                                prompt_info = prompt
                                break
                                
                        if prompt_info and prompt_info.arguments and len(prompt_info.arguments) > 0:
                            # Use the first argument name as the key for the entire sentence
                            arguments[prompt_info.arguments[0].name] = arg_text
                        else:
                            # Default to using "text" as the argument name if no prompt info available
                            arguments["text"] = arg_text
                    
                    # Request permission if needed
                    if self.require_permission:
                        print(f"\nPrompt requested: {name}")
                        print(f"Arguments: {json.dumps(arguments, indent=2)}")
                        permission = input("Do you want to execute this prompt? (y/n): ").strip().lower()
                        if permission not in ('y', 'yes'):
                            print("Operation cancelled by user")
                            continue
                    
                    print(f"\nGetting prompt template: {name}")
                    prompt_result = await self.get_prompt(name, arguments)
                    
                    # Process the prompt with Groq and add to conversation
                    if not self.groq:
                        print("Error: Groq client not initialized. Cannot process prompt.")
                        continue
                        
                    messages = prompt_result.messages
                    
                    # Convert messages to Groq format and include relevant history
                    groq_messages = []
                    
                    # First add the last few user messages to provide document context
                    # (up to 5 recent messages but skip system messages and error messages)
                    recent_messages = []
                    for msg in reversed(self.message_history[-10:]):
                        if msg['role'] in ['user', 'assistant'] and len(recent_messages) < 5:
                            recent_messages.append({
                                "role": msg['role'],
                                "content": msg['content']
                            })
                    
                    # Add recent messages in correct order (oldest first)
                    groq_messages.extend(reversed(recent_messages))
                    
                    # Then add the prompt messages
                    for msg in messages:
                        content = msg.content.text if hasattr(msg.content, 'text') else str(msg.content)
                        groq_messages.append({
                            "role": msg.role,
                            "content": content
                        })
                    
                    print("Processing prompt...")

                    try:
                        response = self.groq.chat.completions.create(
                            model="llama3-70b-8192",
                            messages=groq_messages
                        )
                        
                        response_content = response.choices[0].message.content
                        # Add the prompt and response to conversation history
                        for msg in messages:
                            content = msg.content.text if hasattr(msg.content, 'text') else str(msg.content)
                            await self.add_to_history(msg.role, content)
                        
                        await self.add_to_history("assistant", response_content)
                        
                        print("\nResponse:")
                        print(response_content)
                    
                    except Exception as e:
                        error_msg = f"\nError processing prompt with Groq: {str(e)}"
                        print(error_msg)
                    continue
                
                # List available tools
                elif query.lower() == '/tools':
                    print("\nAvailable Tools:")
                    for tool in self.available_tools:
                        print(f"  - {tool.name}")
                        if tool.description:
                            print(f"    {tool.description}")
                    continue
                    
                # Process regular queries with the specified max_tool_calls
                print("\nProcessing query...")
                response = await self.process_query(query, max_tool_calls)
                print("\n" + response)
                    
            except Exception as e:
                print(f"\nError: {str(e)}")
                if self.debug:
                    import traceback
                    traceback.print_exc()
    
    # ============================================================
    # Resource Cleanup
    # ============================================================  
    async def cleanup(self):
        """Clean up resources"""
        if self.debug:
            logger.info("Cleaning up client resources")
        await self.exit_stack.aclose()

# ============================================================
# Main Function
# ============================================================
async def main():
    """Run the MCP client"""

    # Check for server script path
    if len(sys.argv) < 2:
        print("Usage: python client.py <path_to_server_script>")
        sys.exit(1)
        
    # Email server configuration
    email_server_config = {
        "email_server": {
            "command": "python",
            "args": ["C:/Users/yatha/Desktop/open-notif/InboxIQ/backend/server.py"]
        }
    }
    
    # Log the email server configuration
    logger.info(f"Email server configuration: {email_server_config}")
    
    # Initialize client
    server_script = sys.argv[1]
    client = MCPClient()
    
    # Connect to server
    try:
        connected = await client.connect_to_server(server_script)
        if not connected:
            print(f"Failed to connect to server at {server_script}")
            sys.exit(1)
            
        # Start chat loop
        await client.chat_loop()
    
    # Handle other exceptions
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
    # Cleanup resources
    finally:
        await client.cleanup()

if __name__ == "__main__":
    asyncio.run(main())