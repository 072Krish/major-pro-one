import axios from "axios";

const API = axios.create({
    baseURL: "https://finwise-server-tx10.onrender.com/api",
});

export default API;