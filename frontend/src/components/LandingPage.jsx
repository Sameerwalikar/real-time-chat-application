import { useNavigate } from 'react-router-dom';
import { MessageSquare, Sparkles, Users, ShieldCheck, ChevronDown } from 'lucide-react';
import qrCode from "../assets/qrcode_taskplanet.org.png";
import phone1 from "../assets/attachment-phone-1.png"
import phone2 from "../assets/attachment-phone-2.png"

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="landing-page">
      <section className="landing-hero-section">
        <div className="landing-hero-copy">
          <span className="landing-pill">3w's exclusive messenger app</span>
          <h1>Speak Like Nobody’s Listening</h1>
          <p>
            3w messenger is an easy-to-use instant messaging experience that helps you stay connected.
            Simple, secure, and built for teams, groups, and everyday conversations.
          </p>

          <div className="landing-hero-buttons">
            <button className="landing-btn secondary" onClick={() => navigate('/login')}>
              Login
            </button>
          </div>

          
        </div>

        <div className="landing-hero-visual">
          <div className="landing-hero-phone">
            <img
              src="https://www.arattai.in/sites/oweb/images/arattai/nhome/banner-img3.jpg"
              alt="Hero"
            />
          </div>
          <div className="landing-hero-bubbles">
            <img
              className="landing-bubble bubble-1"
              src="https://www.arattai.in/sites/oweb/images/arattai/nhome/communicate-bubble1.png"
              alt="bubble"
            />
            <img
              className="landing-bubble bubble-2"
              src="https://www.arattai.in/sites/oweb/images/arattai/nhome/communicate-bubble2.png"
              alt="bubble"
            />
            {/* Attached phone mockups (place the provided images at /public/assets/) */}
            
          </div>
        </div>
      </section>

      <section className="landing-features-section">
        <div className="landing-feature-card">
          <Users size={24} />
          <h3>Communicate</h3>
          <p>Use instant chat and groups to stay connected with your friends and family.</p>
        </div>
        <div className="landing-feature-card">
          <ShieldCheck size={24} />
          <h3>Secure</h3>
          <p>We value privacy. Direct messages and calls are encrypted end-to-end.</p>
        </div>
        <div className="landing-feature-card">
          <Sparkles size={24} />
          <h3>Emote</h3>
          <p>Express yourself with stickers, reactions, and fast rich messaging.</p>
        </div>
      </section>

      <section className="landing-faq-section">
        <div className="faq-header">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know before you start using 3w messenger.</p>
        </div>

        <div className="faq-list">
          {[
            {
              question: 'Is 3w messenger free?',
              answer:
                'Yes, it is a free, simple, secure way to connect with friends and family across devices.',
            },
            {
              question: 'What can I use 3w messenger for?',
              answer:
                'Send text and voice messages, make calls, share media, and create groups and channels for easy communication.',
            },
            {
              question: 'Is 3w messenger safe?',
              answer:
                '3w messenger is designed with privacy in mind, and direct chats are protected by strong encryption.',
            },
          ].map((item) => (
            <details key={item.question} className="faq-item">
              <summary>
                {item.question}
                <ChevronDown size={18} />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-cta-copy">
          <h2>So what are you waiting for?</h2>
          <div className="landing-cta-buttons">
            <button className="landing-btn secondary" onClick={() => navigate('/login')}>
              Login
            </button>
          </div>
        </div>
        <div className="landing-cta-visual">
          <div className="qr-card-alt">
            <img
            src={qrCode}
              alt="QR Code"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
