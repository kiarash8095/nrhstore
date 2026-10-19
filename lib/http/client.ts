import axios from "axios";

const api = axios.create({
    baseURL: '/api/catalog',
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    }
})

export default api
