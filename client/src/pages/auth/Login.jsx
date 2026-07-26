import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../assets/css/auth/login.css";
import API from "../../services/api";
import { useSettings } from "../../context/SettingsContext";

function Login() {
    const navigate = useNavigate();
    const { syncLoggedInUser } = useSettings();

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        rememberMe: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value
        });
    };

const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
        toast.error("Please fill all fields.");
        return;
    }

    try {
        setLoading(true);

        const response = await API.post(
            "/auth/login",
            {
                email: formData.email,
                password: formData.password,
            }
        );

        const loggedInUser =
            response.data.user;

        localStorage.setItem(
            "token",
            response.data.token
        );

        localStorage.setItem(
            "user",
            JSON.stringify(loggedInUser)
        );

        syncLoggedInUser(loggedInUser);

        toast.success(
            response.data.message ||
            "Login successful."
        );

        setTimeout(() => {
            navigate("/dashboard");
        }, 800);

    } catch (error) {
        toast.error(
            error.response?.data?.message ||
            "Login failed."
        );
    } finally {
        setLoading(false);
    }
};

    const handleForgotPassword = (e) => {
        e.preventDefault();

        if (!formData.email) {
            toast.error("Please enter your email first.");
            return;
        }

        toast.success("Password reset feature will be added with backend.");
    };

    return (
        <div className="login-page">
            <section className="login-left">
                <div className="hero-content">
                    <h1>FinWise</h1>

                    <h2>
                        Visualize Your
                        <span>Financial Journey</span>
                    </h2>

                    <p>
                        Make smarter financial decisions with
                        <br />
                        real-time insights and powerful analytics.
                    </p>

                    <div className="hero-actions">
                        <div className="store-badge">
                            <i className="fa-solid fa-chart-line"></i>
                            <div>
                                <small>Track</small>
                                <strong>Expenses</strong>
                            </div>
                        </div>

                        <div className="store-badge">
                            <i className="fa-solid fa-wallet"></i>
                            <div>
                                <small>Manage</small>
                                <strong>Budgets</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="login-right">
                <div className="login-card">
                    <h2>Welcome Back 👋</h2>

                    <p>Sign in to manage your money smarter</p>

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Email Address</label>

                            <div className="input-box">
                                <i className="fa-solid fa-envelope"></i>

                                <input
    type="email"
    name="email"
    placeholder="Enter your email"
    value={formData.email}
    onChange={handleChange}
    autoComplete="email"
    required
/>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Password</label>

                            <div className="input-box">
                                <i className="fa-solid fa-lock"></i>

                               <input
    type={showPassword ? "text" : "password"}
    name="password"
    placeholder="Enter your password"
    value={formData.password}
    onChange={handleChange}
    autoComplete="current-password"
    required
/>

                                <i
                                    className={`fa-solid ${
                                        showPassword ? "fa-eye-slash" : "fa-eye"
                                    } toggle-password`}
                                    onClick={() => setShowPassword(!showPassword)}
                                ></i>
                            </div>
                        </div>

                        <div className="login-options">
                            <label>
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                />
                                Remember Me
                            </label>

                            <a href="#" onClick={handleForgotPassword}>
                                Forgot Password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <div className="divider">
                        <span>OR</span>
                    </div>

                    <button type="button" className="google-btn" disabled>
                        <i className="fa-brands fa-google"></i>
                        Continue with Google
                    </button>

                    <small className="google-note">
                        Google login will be available soon.
                    </small>

                    <div className="signup-link">
                        Don't have an account ?
                        <Link to="/signup">Create Account</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Login;