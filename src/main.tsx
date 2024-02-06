import React from "react";
import ReactDOM from "react-dom/client";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import {App} from "./App";
import {Landing} from "./pages/Landing/Landing";
import {Home} from "./pages/Home/Home";
import {Login} from "./pages/Login/Login";
import {NotFound} from "./pages/NotFound/NotFound";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Landing/>,
    },
    {
        path: "/home",
        element: <Home/>,
    },
    {
        path: "/login",
        element: <Login/>,
    },
    {
        path: "*",
        element: <NotFound/>,
    },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App>
            <RouterProvider router={router}/>
        </App>
    </React.StrictMode>
);
