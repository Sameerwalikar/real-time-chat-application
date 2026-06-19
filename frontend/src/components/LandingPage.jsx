import { useNavigate } from 'react-router-dom';
import { Users, Lock, Zap, MessageCircle } from 'lucide-react';
import img1 from "../assets/attachment-phone-1.png"
import img2 from "../assets/attachment-phone-2.png"
import logo from "../assets/3w-logo.png";


export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="landing-main">
      <header className="landing-header">
  <div className="landing-brand">
    <img src={logo} alt="3W Messenger" className="landing-logo" />
    <span>3W Messenger</span>
  </div>

  <div className="landing-header-actions">
    <button
      className="header-login-btn"
      onClick={() => navigate("/login")}
    >
      Login
    </button>

    <button
      className="header-start-btn"
      onClick={() => navigate("/login")}
    >
      Get Started
    </button>
  </div>
</header>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-badge">3w's exclusive messaging app </span>
          <h1 className="hero-title">Connect Instantly, Chat Securely</h1>
          <p className="hero-description">
            3w Messenger brings secure, fast, and reliable messaging to everyone. 
            Talk to friends, create groups, and share moments.
          </p>

          <div className="hero-cta">
            <button className="cta-btn primary" onClick={() => navigate('/login')}>
              Get Started
            </button>
            <button className="cta-btn secondary" onClick={() => navigate('/login')}>
              Login
            </button>
          </div>
        </div>

        <div className="hero-visual">
          {/* Phone Mockups Stack */}
          <div className="phones-container">
            <img 
              src={img1}
              alt="Phone mockup 1" 
              className="phone phone-back"
            />
            <img 
              src={img2}
              alt="Phone mockup 2" 
              className="phone phone-front"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Why Choose 3w Messenger?</h2>
        <div className="features-grid">
          <div className="feature-item">
            <Lock size={32} />
            <h3>End-to-End Encrypted</h3>
            <p>Your messages stay private. Only you and recipients can read them.</p>
          </div>
          <div className="feature-item">
            <Users size={32} />
            <h3>Groups & Channels</h3>
            <p>Create communities, share content, and stay connected with groups.</p>
          </div>
          <div className="feature-item">
            <Zap size={32} />
            <h3>Lightning Fast</h3>
            <p>Instant message delivery with real-time online status updates.</p>
          </div>
          <div className="feature-item">
            <MessageCircle size={32} />
            <h3>Rich Media Support</h3>
            <p>Share photos, documents, and multimedia with ease.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Join?</h2>
          <p>Start chatting securely today. No credit card required.</p>
          <button className="cta-btn primary large" id="btn1" onClick={() => navigate('/login')}>
            Create Account Now
          </button>
        </div>
      </section>
    </main>
  );
}
