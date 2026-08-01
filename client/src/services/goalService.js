import axios from "axios";

const API_URL =
    "https://finwise-server-tx10.onrender.com/api/goals";

const getAuthConfig = () => {
    const token =
        localStorage.getItem("token");

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getGoalsAPI = async () => {
    const response = await axios.get(
        API_URL,
        getAuthConfig()
    );

    return response.data;
};

export const addGoalAPI = async (goalData) => {
    const response = await axios.post(
        API_URL,
        goalData,
        getAuthConfig()
    );

    return response.data;
};

export const updateGoalAPI = async (
    goalId,
    goalData
) => {
    const response = await axios.put(
        `${API_URL}/${goalId}`,
        goalData,
        getAuthConfig()
    );

    return response.data;
};

export const deleteGoalAPI = async (goalId) => {
    const response = await axios.delete(
        `${API_URL}/${goalId}`,
        getAuthConfig()
    );

    return response.data;
};