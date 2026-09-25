import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Provider } from "react-redux";
import { store } from "./store/index.js";

export function meta() {
  return [
    { title: "Pacific Maritime Industries Corp - Interactive Floor Plan" },
    { name: "description", content: "Interactive Shopfloor Facility & Status Monitor for PMI Corp" },
  ];
}

export function links() {
  return [
    { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" },
  ];
}

export default function App() {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="h-full font-sans antialiased overflow-hidden select-none">
        <Provider store={store}>
          <Outlet />
        </Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
