Build your custom agent
⚡️ Quickstart
Get started with building your own custom agent on Bhindi Platform in a few minutes!

​
Why build on Bhindi though?
If you have ever written tools for LLMs, you will feel right in place!
BCP - Bhindi Context Protocol is just that on steroids!
You connect with 15+ OAuth apps out of the box.
So you can focus on your idea and get it out before it becomes dead burried under other 99 dead ideas which you did not ship because some random setup issue took half of your day
​
Start here 👇🏻
https://github.com/upsurgeio/bhindi-agent-starter

We have provideed an Open Source TypeScript-based agent starter kit that demonstrates both public calculator tools and authenticated GitHub tools. Perfect for learning agent development with the Bhindi.io specification.

​
Available OAuth Integrations
Here is a list of Bhindi Agents you can have access of in your agent!

GitHub
Trello
Notion
Linear
Gmail
Google Calendar
Google Docs
Google Sheets
GitHub Pages
Slack
X/Twitter
Typeform
Google Forms
Reddit

You can find these agents and their available tools at https://directory.bhindi.io/

​
📋 Quick Start
​ 0. Clone the agent starter template

Copy

Ask AI
git clone https://github.com/upsurgeio/bhindi-agent-starter
​

1. Install Dependencies

Copy

Ask AI
npm install
​ 2. Build the Project

Copy

Ask AI
npm run build
​ 3. Start the Server

Copy

Ask AI
npm start

# or for development with auto-reload:

npm run dev
​ 4. Test the API

Copy

Ask AI

# Get available tools

curl -X GET "http://localhost:3000/tools"

# Test calculator (no auth needed)

curl -X POST "http://localhost:3000/tools/add" \
 -H "Content-Type: application/json" \
 -d '{"a": 5, "b": 3}'

# Test character counting

curl -X POST "http://localhost:3000/tools/countCharacter" \
 -H "Content-Type: application/json" \
 -d '{"character": "s", "text": "strawberrry"}'
​
🧮 Usage Examples
​
Calculator Tools (No Authentication)

Copy

Ask AI

# Basic addition

curl -X POST "http://localhost:3000/tools/add" \
 -H "Content-Type: application/json" \
 -d '{"a": 10, "b": 5}'

# Division with error handling

curl -X POST "http://localhost:3000/tools/divide" \
 -H "Content-Type: application/json" \
 -d '{"a": 10, "b": 0}' # Will return error

# Factorial (requires confirmation)

curl -X POST "http://localhost:3000/tools/factorial" \
 -H "Content-Type: application/json" \
 -d '{"number": 5}'

# Percentage calculation

curl -X POST "http://localhost:3000/tools/percentage" \
 -H "Content-Type: application/json" \
 -d '{"percentage": 25, "of": 80}'

# Character counting in text

curl -X POST "http://localhost:3000/tools/countCharacter" \
 -H "Content-Type: application/json" \
 -d '{"character": "s", "text": "strawberrry"}'

# Expected response:

# {

# "success": true,

# "responseType": "mixed",

# "data": {

# "operation": "Count 's' in \"strawberrry\"",

# "result": 1,

# "message": "Calculated Count 's' in \"strawberrry\" = 1",

# "tool_type": "calculator"

# }

# }

​
GitHub Tools (Authentication Required)

Copy

Ask AI

# List repositories (requires GitHub token)

curl -X POST "http://localhost:3000/tools/listUserRepositories" \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
 -d '{"per_page": 5, "sort": "updated"}'
​
🚀 Available Tools
​
Calculator Tools
Tool Description Special Features
add Add two numbers Basic operation
subtract Subtract two numbers confirmationRequired: true
multiply Multiply two numbers Basic operation
divide Divide two numbers Error handling for division by zero
power Calculate a^b Supports negative exponents
sqrt Square root Error handling for negative inputs
percentage Calculate percentage Handles decimal percentages
factorial Calculate factorial confirmationRequired: true
countCharacter Count character occurrences in text String manipulation
​
GitHub Tools (Private - Auth Required)
Tool Description Authentication
listUserRepositories List user’s repositories Bearer token required
​
🔐 Authentication
This agent demonstrates hybrid authentication:

Calculator tools: No authentication required (public)
GitHub tools: Bearer token authentication required (private)
​
📚 API Endpoints
GET /tools - Get list of available tools (public)
POST /tools/:toolName - Execute a specific tool (auth depends on tool type)
GET /health - Health check endpoint (shows tool authentication requirements)
GET /docs - Swagger UI documentation (serves public/swagger.json)
​
📖 Documentation & Examples
Swagger Documentation - Available at /docs endpoint when server is running
Postman Collection - Import Bhind-Agent-Starter.postman_collection.json for easy testing
​
🏗️ Project Structure

Copy

Ask AI
src/
├── config/
│ └── tools.json # Tool definitions with JSON Schema
├── controllers/
│ └── appController.ts # Handles both calculator & GitHub tools
├── services/
│ ├── calculatorService.ts # Mathematical operations
│ └── githubService.ts # Simple GitHub API calls
├── routes/
│ ├── toolsRoutes.ts # GET /tools endpoint
│ └── appRoutes.ts # POST /tools/:toolName endpoint
├── middlewares/
│ ├── auth.ts # Authentication utilities
│ └── errorHandler.ts # Error handling middleware
├── types/
│ └── agent.ts # Response type definitions
├── **tests**/
│ └── calculatorService.test.ts # Comprehensive tests
├── app.ts # Express app configuration
└── server.ts # Server entry point
​
🧪 Development

Copy

Ask AI

# Run tests

npm test

# Run tests in watch mode

npm run test:watch

# Lint code

npm run lint

# Format code

npm run format

# Development server with auto-reload

npm run dev
​
🎯 What This Starter Kit Demonstrates
This starter kit teaches you how to build agents with:

Public tools (Calculator - no authentication required)
Authenticated tools (GitHub - Bearer token required)
Mixed authentication patterns in a single agent
Proper parameter validation using JSON Schema
Advanced features like confirmationRequired
Standardized response formats following agent specification
​
✨ Features
​
Calculator Tools (No Authentication)
8 mathematical operations: Basic arithmetic, power, square root, percentage, factorial
Parameter validation: Proper error handling for invalid inputs
Confirmation required: Demonstrates user confirmation for certain operations
​
GitHub Tools (Authentication Required)
Repository listing: List user’s GitHub repositories with Bearer token
Simple REST API: Uses standard fetch calls (no heavy dependencies)
Authentication demonstration: Shows how to handle Bearer tokens
​
Development Features
Full TypeScript support with strict typing
Comprehensive testing with Jest
ESLint + Prettier for code quality
JSON Schema validation for parameters
Standardized error handling
​
🚀 Next Steps
Once you understand this agent, you can:

Add more calculator functions: Trigonometry, logarithms, etc.
Add more authenticated tools: Twitter, Slack, database operations
Implement middleware authentication: Global auth patterns
Add validation middleware: Request/response validation
Add rate limiting: Protect expensive operations
Add database integration: Store calculation history
​
📖 Agent Specification Compliance
This starter follows the Bhindi.io agent specification:

✅ Required endpoints: GET /tools, POST /tools/:toolName
✅ Standardized response formats: BaseSuccessResponseDto, BaseErrorResponseDto
✅ JSON Schema parameter validation
✅ Tool confirmation flow
✅ Authentication patterns (Bearer tokens)
✅ Proper error handling and status codes
Perfect for learning how to build production-ready agents! 🎉

​
Need Help?
We’re here for you! You can reach out to us at:

Discord: Join our community and get help building your next cool agent!
X: @bhindiai for the latest updates and new agent releases
Email: info@bhindi.io

---

Build your custom agent
🛠️ Development Guide
This guide explains how to create external agents that integrate with the system. Each agent must implement specific endpoints and follow authentication patterns.

​
🏗️ Agent Architecture
Every agent must implement 2 required endpoints (GET /tools and POST /tools/:toolName) and 1 optional endpoint (POST /resource):

​

1. GET /tools (Required)
   Returns available tools for the agent.

Response Type: ToolsResponseDto

Copy

Ask AI
export class ToolsResponseDto {
tools: ToolDto[];
}

export class ToolDto {
name: string; // Tool identifier
description: string; // What the tool does
parameters: ToolParameterDto; // JSON Schema for parameters
confirmationRequired?: boolean; // If true, the tool will require user confirmation
}

export class ToolParameterDto {
type: 'object';
properties: Record<string, PropertyDto>; // List of properties for the object
required?: string[]; // List of required parameters
}

export class PropertyDto {
type: 'string' | 'number' | 'boolean' | 'array' | 'object';
description: string;
enum?: string[]; // If the parameter is an enum, list the possible values
default?: string | number | boolean; // Default value for the parameter
items?: PropertyDto; // If the parameter is an array, list the items
}
Example from Slack Agent:

Copy

Ask AI
tools: [
{
name: 'sendMessage',
description:
'Send a message to a Slack user or channel. No need for exact name, it searches through all users and channels. Can directly use this to send message to a user or channel, no need to get the id first if user or channel name is known.',
parameters: {
type: 'object',
properties: {
query: {
type: 'string',
description:
'Name of the user/channel to send message to. Can be a user name, channel name, or a channel id. Never pass a user id, always pass a user name or channel name.',
},
type: {
type: 'string',
description:
'Type of recipient: "user", "channel", "id", or "unknown".',
enum: ['user', 'channel', 'id', 'unknown'],
default: 'unknown',
},
text: {
type: 'string',
description: 'Text content of the message',
},
threadTs: {
type: 'string',
description: 'Optional thread timestamp to reply to a thread',
},
},
required: ['query', 'text'],
},
confirmationRequired: true,
},
];
​ 2. POST /tools/:toolName (Required)
Executes a specific tool with provided parameters.

Parameters:

toolName (path parameter): Name of the tool to execute
Request body: Tool-specific parameters
Response Type: BaseErrorResponseDto | BaseSuccessResponseDto<any>

Copy

Ask AI
export class BaseErrorResponseDto {
success: false;
error: {
message: string;
code: number | string;
details: string;
};

constructor(
message: string,
code: number | string = 500,
details: string = '',
) {
this.success = false;
this.error = {
message,
code,
details,
};
}
}

export class BaseSuccessResponseDto<T> {
success: true;
responseType: string;
data: {
[key: string]: T;
};

constructor(data: T, responseType: 'text' | 'html' | 'media' | 'mixed') {
this.success = true;
this.responseType = responseType;
if (responseType === 'text') {
this.data = {
text: data,
};
} else if (responseType === 'html') {
this.data = {
html: data,
};
} else if (responseType === 'media') {
this.data = {
media: data,
};
} else if (responseType === 'mixed') {
// @ts-expect-error - data is of type T
this.data = {
...data,
};
}
}
}

export class ResponseMediaItem {
type: string;
url: string;
mimeType: string;
description: string;
metadata: object;

constructor(
type: string,
url: string,
mimeType: string,
description: string,
metadata: object = {},
) {
this.type = type;
this.url = url;
this.mimeType = mimeType;
this.description = description;
this.metadata = metadata;
}
}
​ 3. POST /resource (Optional)
Provides contextual information about the current user or environment to help the agent work effectively.

Example Use Cases:

GitHub agent: Return user’s profile and repositories
MongoDB agent: Return database schema information
Slack agent: Return user’s workspace info and frequent contacts
​
Authentication
All requests include authentication headers:

​
API Key Authentication
Header: x-api-key
Used to authenticate the server making the request
Required for all endpoints
​
OAuth Authentication (Optional)
Header: x-api-key
Used to authenticate the server making the request
Required for all endpoints
Header: Authorization: Bearer <token>
Used for agents requiring user-specific OAuth tokens
Examples: Twitter, Slack, GitHub agents
​
Variable Headers (Optional)
Header: x-api-key
Used to authenticate the server making the request
Required for all endpoints
Header: x-<variablename>
Used for agent-specific configuration
Example: x-dburi for MongoDB agent
​
Tool Definition Structure
Each tool in the ToolsResponseDto follows this structure:

Copy

Ask AI
{
name: string; // Tool identifier
description: string; // What the tool does
parameters: { // JSON Schema for parameters
type: 'object';
properties: Record<string, any>;
required?: string[];
};
visibleParameters?: string[]; // Parameters shown in UI
confirmationRequired?: boolean; // Requires user confirmation
}
​
Best Practices
Error Handling: Always return proper error responses using BaseErrorResponseDto
Parameter Validation: Validate all input parameters according to the tool schema
Authentication: Implement proper guards for API key and OAuth validation
Documentation: Provide clear descriptions for tools and parameters
Response Types: Use appropriate response types (text, html, media, mixed)
Confirmation: Set confirmationRequired: true for critical operations
⚡️ Quickstart
🚀 Bring your agent to Bhindi

---

Build your custom agent
🚀 Bring your agent to Bhindi
Once you’ve built and deployed your agent, you can easily integrate it with Bhindi.io to make it accessible through the platform.

​
Integration Process
Create & Deploy Your Agent
Build your agent using this development guide
Deploy it to a publicly accessible endpoint
Ensure both /tools and /tools/:toolName endpoints are working
Add Agent to Your Bhindi Account
Start a new chat on Bhindi.io
Use the following message format:

Copy

Ask AI
Add my agent using Bhindi Agent Manager. The details are as follows:

id: my-special-calculator
name: Special Calculator
description: A powerful calculator that can perform complex mathematical operations and generate visualizations
endpoint: https://my-calculator-app-here.com
With OAuth Integration (Optional)
For agents that need access to services like GitHub, Google, Discord, etc.
First connect the required apps at bhindi.io/apps
Include OAuth services in your agent registration:

Copy

Ask AI
Add my agent using Bhindi Agent Manager. The details are as follows:

id: my-github-analyzer
name: GitHub Repository Analyzer
description: Analyzes GitHub repositories and provides insights
endpoint: https://my-github-analyzer.com
oauth: github, discord
​
Required Information
id: Unique identifier for your agent (lowercase, hyphens allowed)
name: Display name for your agent
description: What your agent does and its capabilities
endpoint: Public HTTPS URL where your agent is deployed
oauth (optional): Comma-separated list of services your agent needs access to
​
OAuth Access
For agents requiring OAuth access:

Connect Apps First: Visit bhindi.io/apps and connect the required services (GitHub, Google, Discord, etc.)
Account Access: Your custom agent will get access to predefined scopes only, not full authentication access to connected accounts
Supported Services: Include any of the 15+ integrations available in the Bhindi ecosystem
Note: OAuth agents can only access the specific scopes that are currently configured in Bhindi, ensuring secure and limited access to your connected accounts.

​
Integration Support
The Bhindi Agent Manager will guide you through the integration process and help resolve any issues during setup.
