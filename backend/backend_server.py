import asyncio
import json
import logging
from typing import Optional, List, Dict, Any
from contextlib import AsyncExitStack
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware  # Add CORS support
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from groq import Groq

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("document-search-server")

# Environment Variables
GROQ_API_KEY = "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"

class MCPClient:
    def __init__(self, debug=False):
        """Initialize the MCP client.
        
        Args:
            debug: Whether to enable debug logging
        """
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.debug = debug
        self.require_permission = True
        self.message_history = []
        self.system_prompt = "You are a helpful RAG AI assistant named 'RAG-AI-MCP' that can answer questions about the provided documents or query the attached database for more information."
        self.groq = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
        self.available_tools = []
        self.available_resources = []
        self.available_prompts = []
        self.server_name = None
        self.websocket: Optional[WebSocket] = None  # Added for WebSocket integration

    async def ask_permission(self, action_description: str) -> bool:
        """Ask user for permission before performing an action via WebSocket or CLI.
        
        Args:
            action_description: Description of the action to be performed
            
        Returns:
            bool: True if permission granted, False otherwise
        """
        if self.websocket:
            # Filter sensitive information and format action description
            formatted_action = self.format_permission_request(action_description)
            
            # Send a structured permission request message
            permission_request = {
                "type": "permission_request",
                "action": formatted_action,
                "request_id": f"perm_{int(asyncio.get_event_loop().time() * 1000)}"
            }
            await self.websocket.send_text(json.dumps(permission_request))
            
            # Wait for response
            response_text = await self.websocket.receive_text()
            try:
                response = json.loads(response_text)
                if isinstance(response, dict) and "type" in response and response["type"] == "permission_response":
                    return response.get("approved", False)
                return response_text.strip().lower() in ['yes', 'y']  # Fallback for plain text responses
            except json.JSONDecodeError:
                # Handle plain text responses as fallback
                return response_text.strip().lower() in ['yes', 'y']
        else:
            # For CLI interaction, also filter sensitive information
            formatted_action = self.format_permission_request(action_description)
            while True:
                response = input(f"The system wants to {formatted_action}. Do you allow this? (yes/no): ").strip().lower()
                if response in ['yes', 'y']:
                    return True
                elif response in ['no', 'n']:
                    return False
                else:
                    print("Please answer yes or no.")

    def format_permission_request(self, action_description: str) -> str:
        """Format permission request to hide sensitive information and improve presentation.
        
        Args:
            action_description: The original action description
            
        Returns:
            Formatted action description with sensitive info removed
        """
        # Remove user_id and email_address from the description
        filtered_desc = action_description
        
        # Filter out user_id patterns
        filtered_desc = self.filter_sensitive_info(filtered_desc, "user_id", "user ID")
        
        # Filter out email address patterns
        filtered_desc = self.filter_sensitive_info(filtered_desc, "email_address", "your email")
        
        # Special formatting for email sending
        if "send an email" in filtered_desc.lower():
            return self.format_email_permission(filtered_desc)
        
        # Special formatting for email retrieval
        if any(x in filtered_desc.lower() for x in ["search emails", "get email", "read email", "find email"]):
            return self.format_email_retrieval_permission(filtered_desc)
            
        return filtered_desc
        
    def filter_sensitive_info(self, text: str, sensitive_key: str, replacement: str) -> str:
        """Remove sensitive information from a string.
        
        Args:
            text: The text to process
            sensitive_key: The sensitive key to look for (e.g., "user_id")
            replacement: What to replace the sensitive info with
            
        Returns:
            Text with sensitive information replaced
        """
        import re
        # Pattern like: user_id: 123abc or "user_id": "123abc"
        patterns = [
            rf'{sensitive_key}:\s*["\']?([^"\',\s}})]+)["\']?',  # Basic key: value
            rf'["\']?{sensitive_key}["\']?\s*:\s*["\']?([^"\',\s}})]+)["\']?',  # JSON-style "key": "value"
        ]
        
        for pattern in patterns:
            text = re.sub(pattern, f"{sensitive_key}: [PRIVATE]", text)
            
        return text
        
    def format_email_permission(self, description: str) -> str:
        """Format email sending permission request in a more user-friendly way.
        
        Args:
            description: Original description with email details
            
        Returns:
            Formatted email permission request
        """
        # Extract email details using regex
        import re
        
        to_match = re.search(r'to:\s*["\']?([^"\',\s}})]+)["\']?', description)
        subject_match = re.search(r'subject:\s*["\']?([^"\',}})]+)["\']?', description) 
        
        to_address = to_match.group(1) if to_match else "recipient"
        subject = subject_match.group(1) if subject_match else "No Subject"
        
        # Format a nice email permission request
        return f"send an email to {to_address} with subject \"{subject}\"\n\nDo you want to approve this operation?"
        
    def format_email_retrieval_permission(self, description: str) -> str:
        """Format email retrieval permission request in a more user-friendly way.
        
        Args:
            description: Original description with retrieval details
            
        Returns:
            Formatted email retrieval permission request
        """
        # Extract query details if available
        import re
        
        query_match = re.search(r'query:\s*["\']?([^"\',}})]+)["\']?', description)
        query = query_match.group(1) if query_match else ""
        
        action_type = "retrieve"
        if "search" in description.lower():
            action_type = "search for"
        elif "get" in description.lower():
            action_type = "retrieve"
        elif "read" in description.lower():
            action_type = "read"
            
        if query:
            return f"{action_type} emails matching \"{query}\"\n\nDo you want to approve this operation?"
        else:
            return f"{action_type} emails from your account\n\nDo you want to approve this operation?"

    async def connect_to_server(self, server_script_path: str):
        """Connect to an MCP server
        
        Args:
            server_script_path: Path to the server script (.py or .js)
        """
        if self.debug:
            logger.info(f"Connecting to server at {server_script_path}")
            
        is_python = server_script_path.endswith('.py')
        if not is_python:
            raise ValueError("Server script must be a .py file")

        server_params = StdioServerParameters(
            command="python",
            args=[server_script_path],
            env=None
        )

        try:
            stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
            self.stdio, self.write = stdio_transport
            self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))
            
            init_result = await self.session.initialize()
            self.server_name = init_result.serverInfo.name
            
            if self.debug:
                logger.info(f"Connected to server: {self.server_name} v{init_result.serverInfo.version}")
            
            await self.refresh_capabilities()
            
            return True
        
        except Exception as e:
            logger.error(f"Failed to connect to server: {e}")
            return False
    
    async def refresh_capabilities(self):
        """Refresh the client's knowledge of server capabilities"""
        if not self.session:
            raise ValueError("Not connected to server")
            
        tools_response = await self.session.list_tools()
        self.available_tools = tools_response.tools
        
        resources_response = await self.session.list_resources()
        self.available_resources = resources_response.resources
        
        prompts_response = await self.session.list_prompts()
        self.available_prompts = prompts_response.prompts
        
        if self.debug:
            logger.info(f"Server capabilities refreshed:")
            logger.info(f"- Tools: {len(self.available_tools)}")
            logger.info(f"- Resources: {len(self.available_resources)}")
            logger.info(f"- Prompts: {len(self.available_prompts)}")

    async def add_to_history(self, role: str, content: str, metadata: Dict[str, Any] = None):
        """Add a message to the history
        
        Args:
            role: The role of the message sender (user, assistant, system, resource)
            content: The message content
            metadata: Optional metadata about the message
        """
        message = {
            "role": role,
            "content": content,
            "timestamp": asyncio.get_event_loop().time(),
            "metadata": metadata or {}
        }
        self.message_history.append(message)
        
        if self.debug:
            logger.info(f"Added message to history: {role} - {content[:100]}...")

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

    async def read_resource(self, uri: str):
        """Read content from a specific resource
        
        Args:
            uri: The URI of the resource to read
        
        Returns:
            The content of the resource as a string
        """
        if self.debug:
            logger.info(f"Reading resource: {uri}")
            
        try:
            result = await self.session.read_resource(uri)
            
            if not result:
                content = "No content found for this resource."
            else:
                content = result if isinstance(result, str) else str(result)
            
            resource_message = f"Resource content from {uri}:\n\n{content}"
            await self.add_to_history("user", resource_message, {"resource_uri": uri, "is_resource": True})
            
            return content
        
        except Exception as e:
            error_msg = f"Error reading resource {uri}: {str(e)}"
            logger.error(error_msg)
            await self.add_to_history("user", error_msg, {"uri": uri, "error": True})
            return error_msg

    async def list_prompts(self):
        """List available prompts from the MCP server"""
        response = await self.session.list_prompts()
        self.available_prompts = response.prompts
        
        if self.debug:
            prompt_names = [prompt.name for prompt in self.available_prompts]
            logger.info(f"Available prompts: {prompt_names}")
        
        return self.available_prompts

    async def get_prompt(self, name: str, arguments: dict = None):
        """Get a specific prompt with arguments
        
        Args:
            name: The name of the prompt
            arguments: Optional arguments to pass to the prompt
            
        Returns:
            The prompt result
        """
        if self.require_permission and not await self.ask_permission(f"get prompt '{name}' with arguments {arguments}"):
            raise ValueError("Permission denied to get prompt")
            
        if self.debug:
            logger.info(f"Getting prompt: {name} with arguments: {arguments}")
            
        try:
            prompt_result = await self.session.get_prompt(name, arguments)
            return prompt_result
        except Exception as e:
            error_msg = f"Error getting prompt {name}: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)

    async def request_permission(self, tool_name: str, tool_args: dict) -> bool:
        """Request permission from the user before executing a tool.
        
        Args:
            tool_name: The name of the tool to execute
            tool_args: The arguments to pass to the tool
            
        Returns:
            True if the user grants permission, False otherwise
        """
        if not self.require_permission:
            return True
            
        # Filter sensitive args before creating the action description
        filtered_args = {k: v if not k.lower() in ["user_id", "email_address"] else "[PRIVATE]" 
                        for k, v in tool_args.items()}
        
        if tool_name == "send_email":
            # For email sending, create a more specific and user-friendly action description
            action = f"send an email to: {tool_args.get('to', 'recipient')}\nsubject: {tool_args.get('subject', 'No Subject')}"
            if 'html' in tool_args and tool_args['html']:
                action += "\n(HTML email)"
        elif tool_name == "search_emails":
            # For email searching
            action = f"search emails with query: {tool_args.get('query', '')}"
        elif tool_name in ["get_email_content", "find_email_threads"]:
            # For email content retrieval
            action = f"retrieve contents of email with ID: {tool_args.get('email_id', '')}"
        else:
            # Generic action description for other tools
            action = f"execute tool '{tool_name}' with filtered arguments:\n{json.dumps(filtered_args, indent=2)}"
            
        return await self.ask_permission(action)

    async def process_query(self, query: str, max_tool_calls: int = 5) -> str:
        """Process a query using Groq and available tools
        
        Args:
            query: The query to process
            max_tool_calls: Maximum number of tool call iterations allowed
            
        Returns:
            The response from the AI after processing the query
        """
        await self.add_to_history("user", query)
        
        tool_call_count = 0
        final_text = []
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": query}
        ]
        
        while tool_call_count < max_tool_calls:
            if self.debug:
                logger.info(f"Tool call iteration {tool_call_count + 1}/{max_tool_calls}")
            
            if not self.available_tools:
                await self.refresh_capabilities()

            available_tools = [{
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.inputSchema
                }
            } for tool in self.available_tools]

            try:
                response = self.groq.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=messages,
                    tools=available_tools,
                    tool_choice="auto"
                )
            except Exception as e:
                error_msg = f"Error calling Groq API: {str(e)}"
                logger.error(error_msg)
                await self.add_to_history("assistant", error_msg, {"error": True})
                return error_msg

            assistant_message = response.choices[0].message
            response_content = assistant_message.content or ""
            
            tool_calls_metadata = {}
            if hasattr(assistant_message, 'tool_calls') and assistant_message.tool_calls:
                tool_calls_metadata = {
                    "has_tool_calls": True,
                    "tool_calls": assistant_message.tool_calls
                }
            
            await self.add_to_history("assistant", response_content, tool_calls_metadata)
            
            if response_content:
                final_text.append(response_content)
            
            if not hasattr(assistant_message, 'tool_calls') or not assistant_message.tool_calls:
                break
                
            messages.append({
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": assistant_message.tool_calls
            })
            
            any_tools_executed = False
            
            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = tool_call.function.arguments
                
                if isinstance(tool_args, str):
                    try:
                        tool_args = json.loads(tool_args)
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse tool arguments as JSON: {tool_args}")
                        tool_args = {}
                
                permission_granted = await self.request_permission(tool_name, tool_args)
                
                if not permission_granted:
                    permission_denied_msg = f"Permission denied to execute tool: {tool_name}"
                    logger.info(permission_denied_msg)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": permission_denied_msg
                    })
                    await self.add_to_history("tool", permission_denied_msg, 
                                            {"tool": tool_name, "permission": "denied", "tool_call_id": tool_call.id})
                    
                    # Create a more user-friendly message
                    user_friendly_msg = f"I need your permission to perform this action, but you've denied the request. If you'd like to allow this action in the future, please let me know and I'll ask again."
                    final_text.append(f"\n{user_friendly_msg}\n[Permission denied for tool {tool_name}]")
                    continue
                
                try:
                    result = await self.session.call_tool(tool_name, tool_args)
                    tool_content = result.content if hasattr(result, 'content') else str(result)
                    final_text.append(f"\n[Calling tool {tool_name} with args {tool_args}]")
                    
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
            
            if any_tools_executed:
                tool_call_count += 1
                if tool_call_count >= max_tool_calls:
                    final_text.append(f"\n[Reached maximum of {max_tool_calls} tool call iterations]")
            else:
                break
        
        if tool_call_count > 0:
            try:
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

    async def cleanup(self):
        """Clean up resources"""
        if self.debug:
            logger.info("Cleaning up client resources")
        await self.exit_stack.aclose()

app = FastAPI()

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Handle WebSocket connections"""
    await websocket.accept()
    client = MCPClient()
    client.websocket = websocket
    server_script = "C:\\Users\\yatha\\Desktop\\open-notif\\InboxIQ\\backend\\server.py"
    connected = await client.connect_to_server(server_script)
    if not connected:
        await websocket.send_text("Failed to connect to MCP server")
        return
    try:
        await chat_loop(client, websocket)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        logger.info("Cleaning up client resources")
        await client.cleanup()

async def chat_loop(client: MCPClient, websocket: WebSocket):
    """Handle WebSocket conversation loop"""
    # await websocket.send_text(f"Connected to {client.server_name}")
    # await websocket.send_text("Available commands: /debug, /permissions, /max_tools <number>, /refresh, /resources, /resource <uri>, /prompts, /prompt <name> <argument>, /tools, /quit")
    
    max_tool_calls = 5
    
    while True:
        try:
            message = await websocket.receive_text()
            if message.lower() == '/quit':
                break
            elif message.lower() == '/debug':
                client.debug = not client.debug
                await websocket.send_text(f"Debug mode {'enabled' if client.debug else 'disabled'}")
            elif message.lower() == '/permissions':
                client.require_permission = not client.require_permission
                await websocket.send_text(f"Permission requirements {'enabled' if client.require_permission else 'disabled'}")
            elif message.lower().startswith('/max_tools '):
                try:
                    max_tool_calls = int(message[11:].strip())
                    if max_tool_calls < 1:
                        await websocket.send_text("Maximum tool calls must be at least 1")
                    else:
                        await websocket.send_text(f"Maximum tool call iterations set to: {max_tool_calls}")
                except ValueError:
                    await websocket.send_text("Invalid number. Usage: /max_tools <number>")
            elif message.lower() == '/refresh':
                await client.refresh_capabilities()
                await websocket.send_text("Server capabilities refreshed")
            elif message.lower() == '/resources':
                resources = await client.list_resources()
                resource_list = "\n".join([f"- {res.uri}: {res.description}" if res.description else f"- {res.uri}" for res in resources])
                await websocket.send_text(f"Available Resources:\n{resource_list}")
            elif message.lower().startswith('/resource '):
                uri = message[10:].strip()
                if client.require_permission:
                    allowed = await client.ask_permission(f"read resource '{uri}'")
                    if not allowed:
                        await websocket.send_text("Operation cancelled by user")
                        continue
                content = await client.read_resource(uri)
                await websocket.send_text(f"Resource Content ({uri}):\n{content}")
            elif message.lower() == '/prompts':
                prompts = await client.list_prompts()
                prompt_list = "\n".join([f"- {prompt.name}: {prompt.description}" if prompt.description else f"- {prompt.name}" for prompt in prompts])
                await websocket.send_text(f"Available Prompts:\n{prompt_list}")
            elif message.lower().startswith('/prompt '):
                parts = message[8:].strip().split(maxsplit=1)
                if not parts:
                    await websocket.send_text("Error: Prompt name required")
                    continue
                name = parts[0]
                arguments = {}
                if len(parts) > 1:
                    arg_text = parts[1]
                    prompt_info = next((p for p in client.available_prompts if p.name == name), None)
                    if prompt_info and prompt_info.arguments:
                        arguments[prompt_info.arguments[0].name] = arg_text
                    else:
                        arguments["text"] = arg_text
                if client.require_permission:
                    allowed = await client.ask_permission(f"execute prompt '{name}' with arguments {arguments}")
                    if not allowed:
                        await websocket.send_text("Operation cancelled by user")
                        continue
                prompt_result = await client.get_prompt(name, arguments)
                if not client.groq:
                    await websocket.send_text("Error: Groq client not initialized. Cannot process prompt.")
                    continue
                messages = prompt_result.messages
                groq_messages = []
                recent_messages = [msg for msg in client.message_history[-5:] if msg['role'] in ['user', 'assistant']]
                groq_messages.extend(recent_messages)
                for msg in messages:
                    content = msg.content.text if hasattr(msg.content, 'text') else str(msg.content)
                    groq_messages.append({"role": msg.role, "content": content})
                try:
                    response = client.groq.chat.completions.create(
                        model="llama3-70b-8192",
                        messages=groq_messages
                    )
                    response_content = response.choices[0].message.content
                    for msg in messages:
                        content = msg.content.text if hasattr(msg.content, 'text') else str(msg.content)
                        await client.add_to_history(msg.role, content)
                    await client.add_to_history("assistant", response_content)
                    await websocket.send_text(response_content)
                except Exception as e:
                    await websocket.send_text(f"Error processing prompt with Groq: {str(e)}")
            elif message.lower() == '/tools':
                tool_list = "\n".join([f"- {tool.name}: {tool.description}" if tool.description else f"- {tool.name}" for tool in client.available_tools])
                await websocket.send_text(f"Available Tools:\n{tool_list}")
            else:
                response = await client.process_query(message, max_tool_calls)
                await websocket.send_text(response)
        except Exception as e:
            await websocket.send_text(f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)