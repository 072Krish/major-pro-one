import axios from "axios";

const API_URL =
    "https://finwise-server-tx10.onrender.com/api/settings";

const getAuthConfig = () => {

    const token =
        localStorage.getItem("token");

    return {

        headers: {
            Authorization: `Bearer ${token}`,
        },

    };

};


// ======================================
// GET SETTINGS
// ======================================

export const getSettingsAPI = async () => {

    const response = await axios.get(

        API_URL,

        getAuthConfig()

    );

    return response.data;

};


// ======================================
// UPDATE SETTINGS
// ======================================

export const updateSettingsAPI = async (
    settings
) => {

    const response = await axios.put(

        API_URL,

        settings,

        getAuthConfig()

    );

    return response.data;

};

// ======================================
// UPDATE PROFILE
// ======================================

export const updateProfileAPI = async (
    profileData
) => {

    const response = await axios.put(

        `${API_URL}/profile`,

        profileData,

        getAuthConfig()

    );

    return response.data;

};

// ======================================
// CHANGE PASSWORD
// ======================================

export const changePasswordAPI = async (
    passwordData
) => {

    const response = await axios.put(

        `${API_URL}/password`,

        passwordData,

        getAuthConfig()

    );

    return response.data;

};