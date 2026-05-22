// Global loading overlay. Renders when `globalloading.isLoadingGlobally`
// is true. Shows the ShivaTrade logo in a card with a spinning ring and a
// subtle backdrop so the brand stays visible while async work is running.

import { useSelector } from "react-redux";

import logo from "@src/assets/images/logo/login-logo.png";

const SimpleSpinner = ({ className = "" }) => {
  const isLoading = useSelector(
    (state) => state.globalloading.isLoadingGlobally
  );

  if (!isLoading) return null;

  return (
    <>
      <style>{`
        @keyframes shivatrade-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes shivatrade-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        .st-loader-overlay {
          position: fixed;
          inset: 0;
          background: rgba(248, 248, 252, 0.78);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1080;
        }
        .st-loader-card {
          width: 124px;
          height: 124px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 40px rgba(115, 103, 240, 0.18),
                      0 4px 12px rgba(0, 0, 0, 0.06);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .st-loader-ring {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          border: 3px solid rgba(115, 103, 240, 0.18);
          border-top-color: #7367f0;
          animation: shivatrade-spin 1.1s linear infinite;
        }
        .st-loader-logo {
          width: 64px;
          height: auto;
          object-fit: contain;
          animation: shivatrade-pulse 1.6s ease-in-out infinite;
          z-index: 1;
        }
      `}</style>
      <div className={className || "st-loader-overlay"}>
        <div className="st-loader-card">
          <div className="st-loader-ring" />
          <img src={logo} alt="ShivaTrade" className="st-loader-logo" />
        </div>
      </div>
    </>
  );
};

export default SimpleSpinner;
