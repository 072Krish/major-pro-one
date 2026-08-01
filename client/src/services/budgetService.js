import axios from "axios";

const API_URL =
    "https://finwise-server-tx10.onrender.com/api/budget";

const getAuthConfig = () => {
    const token =
        localStorage.getItem("token");

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};


// ===============================
// GET USER BUDGET
// ===============================

export const getBudgetAPI = async () => {
    const response = await axios.get(
        API_URL,
        getAuthConfig()
    );

    return response.data;
};


// ===============================
// UPDATE MONTHLY BUDGET
// ===============================

export const updateMonthlyBudgetAPI = async (
    monthlyBudget
) => {
    const response = await axios.put(
        `${API_URL}/monthly`,
        {
            monthlyBudget,
        },
        getAuthConfig()
    );

    return response.data;
};


// ===============================
// UPDATE CATEGORY BUDGETS
// ===============================

export const updateCategoryBudgetsAPI = async (
    categoryBudgets
) => {
    const response = await axios.put(
        `${API_URL}/categories`,
        {
            categoryBudgets,
        },
        getAuthConfig()
    );

    return response.data;
};