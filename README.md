# Supabase Schema Visualizer 🗄️

> A powerful AI-powered database schema visualization and management tool that lets you interact with your Supabase databases conversationally.

## 🎥 Demo Video

[![Watch the Demo](https://img.youtube.com/vi/DoGv47j3qEo/maxresdefault.jpg)](https://youtu.be/DoGv47j3qEo)

**👆 Click above to watch the full demo and walkthrough!**



## 🎯 Overview

Supabase Schema Visualizer is a Next.js application that combines the power of **Supabase MCP** (Model Context Protocol) with **Tambo's AI-powered UI generation** to provide an intuitive, conversational interface for managing and visualizing database schemas.

### Key Features

- 🤖 **Conversational Database Management** - Interact with your Supabase databases using natural language
- 📊 **Visual Schema Designer** - Interactive canvas for designing and visualizing database schemas with drag-and-drop functionality
- 🔗 **Relationship Mapping** - Automatically visualize foreign key relationships between tables
- 🎨 **AI-Powered UI Components** - Dynamic component rendering based on your queries using Tambo
- 🔐 **Secure Authentication** - Built-in Supabase authentication with token-based MCP server access
- 📈 **Real-time Data Visualization** - View table data, statistics, and metadata in beautiful UI components
- 💾 **SQL Export** - Generate SQL scripts from your visual schema designs
- 🚀 **Live MCP Integration** - Connect directly to Supabase MCP tools for real-time database operations

## 🏗️ Architecture

### How It Works

1. **MCP Server Integration**
   - On startup, a local Supabase MCP server is launched via `src/server.ts`
   - The app fetches tool definitions from the MCP server and registers them with Tambo
   - All database operations are proxied through a secure Express server

2. **AI-Powered Components**
   - React components are registered as "UI tools" with Tambo (see `src/lib/tambo.ts`)
   - When you submit a message, it's sent to Tambo along with available tools and components
   - Tambo's AI decides which tools to call and what UI to render

3. **Schema Visualization**
   - Uses **ReactFlow** to render an interactive node-based canvas
   - Tables are represented as nodes with columns and types
   - Relationships are visualized as edges connecting related tables
   - Full CRUD operations on tables and columns through the visual interface

### Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Database:** Supabase (PostgreSQL)
- **AI Integration:** Tambo AI, MCP (Model Context Protocol)
- **Visualization:** ReactFlow (XyFlow), Recharts
- **Styling:** TailwindCSS
- **State Management:** Zustand
- **Backend:** Express.js proxy server

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- A Supabase account and project ([Sign up here](https://supabase.com))
- A Tambo API key ([Get one free here](https://tambo.co/dashboard))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd supabase-mcp-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_TAMBO_API_KEY=your_tambo_api_key
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN=your_supabase_personal_access_token
   NEXT_PUBLIC_SERVER_PORT=3003
   ```

   **Where to find your keys:**
   - **Tambo API Key:** Get from [Tambo Dashboard](https://tambo.co/dashboard) or run `npx tambo init`
   - **Supabase URL & Anon Key:** Found in your Supabase project settings under "API"
   - **Supabase Access Token:** Generate at [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens)

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. On first launch, you'll be prompted to authenticate with Supabase
2. The app will request your Supabase personal access token (stored securely in localStorage)
3. Once authenticated, you can start interacting with your databases!

## 💡 Usage

### Conversational Commands

Ask questions naturally in the chat interface:

- "Show me all my tables"
- "What's the structure of the users table?"
- "Create a new table called products with id, name, and price columns"
- "Visualize the schema for my database"
- "Show me all projects in my Supabase account"
- "Execute SELECT * FROM users LIMIT 10"

### Visual Schema Designer

1. Navigate to the Schema Canvas
2. Drag and drop to position tables
3. Click tables to edit columns and properties
4. Connections automatically show foreign key relationships
5. Export your schema as SQL when ready

### Available Components

The following UI components can be rendered by the AI:

- **ProjectList** - Display all your Supabase projects
- **TableList** - Show database tables with metadata
- **Table** - Render query results in a data table
- **Graph** - Visualize data with charts
- **SchemaCanvas** - Interactive visual schema designer

## 🔧 Customization

### Adding MCP Servers

To add additional MCP servers, update the `mcpServers` array in `src/app/layout.tsx`:

```tsx
<TamboMcpProvider
  mcpServers={[
    `http://localhost:${process.env.NEXT_PUBLIC_SERVER_PORT}/sse`,
    "https://another-mcp-server-url",
  ]}
>
```

### Registering Custom Components

Add new components to Tambo in `src/lib/tambo.ts`:

```tsx
const components: TamboComponent[] = [
  {
    name: "myCustomComponent",
    description: "A component that does something awesome",
    component: MyCustomComponent,
    propsSchema: z.object({
      data: z.string().describe("The data to display"),
    }),
  },
  // ... other components
];
```

### Limiting Query Results

To optimize performance, limit the number of rows returned by queries:

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Data API**
3. Adjust the **Max rows** setting (default: 1000)

## 📁 Project Structure

```
supabase-mcp-client/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Authentication pages
│   │   └── dashboard/         # Main dashboard
│   ├── components/            # React components
│   │   ├── schema-canvas.tsx  # Visual schema designer
│   │   ├── table-node.tsx     # Table visualization node
│   │   ├── project-list.tsx   # Supabase projects list
│   │   └── ui/                # Reusable UI components
│   ├── lib/
│   │   ├── tambo.ts           # Tambo component registration
│   │   ├── supabase/          # Supabase client & auth
│   │   ├── store/             # Zustand state management
│   │   └── sql-generator.ts   # SQL export utilities
│   ├── types/                 # TypeScript type definitions
│   ├── server.ts              # Express MCP proxy server
│   └── schema-mcp-server.ts   # Schema MCP server
├── .env.local                 # Environment variables
└── package.json
```

## 🔐 Security Notes

- **Never commit real access tokens** to version control
- The service role key should **never** be exposed client-side
- Access tokens are currently stored in localStorage (temporary solution)
- Always use the anon key for client-side operations
- Enable Row Level Security (RLS) on your Supabase tables

## 🎓 Learn More

- [Tambo Documentation](https://tambo.co/docs) - Learn about AI-powered UI components
- [Supabase MCP GitHub](https://github.com/supabase-community/supabase-mcp) - Official MCP server for Supabase
- [Model Context Protocol](https://modelcontextprotocol.io/) - Understanding MCP
- [Supabase Docs](https://supabase.com/docs) - Complete Supabase documentation
- [ReactFlow Docs](https://reactflow.dev/) - Building node-based UIs

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Tambo](https://tambo.co) - AI-powered UI framework
- Powered by [Supabase](https://supabase.com) - Open source Firebase alternative
- Schema visualization by [ReactFlow](https://reactflow.dev)
- Icons by [Lucide](https://lucide.dev)

---

**Built with ❤️ for the Hackathon**

Need help? Found a bug? [Open an issue](https://github.com/yourusername/yourrepo/issues)
