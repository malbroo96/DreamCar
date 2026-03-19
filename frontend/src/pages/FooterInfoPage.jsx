import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FOOTER_CONTENT } from "../data/footerContent";
import "./FooterInfoPage.css";

const calculateEmi = ({ price, downPayment, rate, months }) => {
  const principal = price - downPayment;
  const monthlyRate = rate / 100 / 12;

  if (principal <= 0 || months <= 0) {
    return { principal: 0, emi: 0, totalInterest: 0, totalPayment: 0 };
  }

  const emi = monthlyRate === 0
    ? principal / months
    : (principal * monthlyRate * Math.pow(1 + monthlyRate, months))
      / (Math.pow(1 + monthlyRate, months) - 1);
  const totalPayment = emi * months + downPayment;
  const totalInterest = emi * months - principal;

  return { principal, emi, totalInterest, totalPayment };
};

const FooterInfoPage = () => {
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const [price, setPrice] = useState(800000);
  const [downPayment, setDownPayment] = useState(160000);
  const [rate, setRate] = useState(8.5);
  const [months, setMonths] = useState(60);

  const page = useMemo(() => FOOTER_CONTENT[slug], [slug]);
  const emiSummary = useMemo(
    () => calculateEmi({ price, downPayment, rate, months }),
    [price, downPayment, rate, months]
  );
  const maxDownPayment = Math.max(price, 0);
  const isEmiPage = slug === "car-emi-calculator";

  if (!page) {
    return (
      <section className="footer-info-page">
        <div className="footer-info-shell card">
          <button type="button" className="footer-info-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="footer-info-title">Page not found</h1>
          <p className="footer-info-intro">The footer page you opened is not available right now.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="footer-info-page">
      <div className="footer-info-shell card">
        <button type="button" className="footer-info-back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <p className="footer-info-category">{page.category}</p>
        <h1 className="footer-info-title">{page.title}</h1>
        <p className="footer-info-intro">{page.intro}</p>

        {isEmiPage && (
          <div className="footer-emi-card">
            <div className="footer-emi-result">
              <div>
                <p className="footer-emi-label">Estimated Monthly EMI</p>
                <p className="footer-emi-value">Rs {Math.round(emiSummary.emi).toLocaleString("en-IN")}</p>
              </div>
              <div className="footer-emi-grid">
                <div className="footer-emi-stat">
                  <span>Loan Amount</span>
                  <strong>Rs {Math.round(emiSummary.principal).toLocaleString("en-IN")}</strong>
                </div>
                <div className="footer-emi-stat">
                  <span>Total Interest</span>
                  <strong>Rs {Math.round(emiSummary.totalInterest).toLocaleString("en-IN")}</strong>
                </div>
                <div className="footer-emi-stat">
                  <span>Total Payment</span>
                  <strong>Rs {Math.round(emiSummary.totalPayment).toLocaleString("en-IN")}</strong>
                </div>
              </div>
            </div>

            <div className="footer-emi-fields">
              <label className="footer-emi-field">
                <span>Car Price</span>
                <input type="number" min="100000" step="10000" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
              </label>
              <label className="footer-emi-field">
                <span>Down Payment</span>
                <input type="number" min="0" max={maxDownPayment} step="10000" value={downPayment} onChange={(e) => setDownPayment(Math.min(Number(e.target.value) || 0, maxDownPayment))} />
              </label>
              <label className="footer-emi-field">
                <span>Interest Rate (% p.a.)</span>
                <input type="number" min="0" max="30" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} />
              </label>
              <label className="footer-emi-field">
                <span>Tenure (months)</span>
                <input type="number" min="6" max="120" step="1" value={months} onChange={(e) => setMonths(Number(e.target.value) || 0)} />
              </label>
            </div>

            <div className="footer-emi-sliders">
              <label className="footer-emi-slider">
                <span>Price Range</span>
                <input type="range" min="100000" max="5000000" step="50000" value={Math.min(price, 5000000)} onChange={(e) => setPrice(Number(e.target.value))} />
              </label>
              <label className="footer-emi-slider">
                <span>Down Payment Range</span>
                <input type="range" min="0" max={maxDownPayment || 100000} step="10000" value={Math.min(downPayment, maxDownPayment)} onChange={(e) => setDownPayment(Number(e.target.value))} />
              </label>
              <label className="footer-emi-slider">
                <span>Interest Rate Range</span>
                <input type="range" min="0" max="20" step="0.1" value={Math.min(rate, 20)} onChange={(e) => setRate(Number(e.target.value))} />
              </label>
              <label className="footer-emi-slider">
                <span>Tenure Range</span>
                <input type="range" min="6" max="120" step="6" value={Math.min(months, 120)} onChange={(e) => setMonths(Number(e.target.value))} />
              </label>
            </div>
          </div>
        )}

        <div className="footer-info-sections">
          {page.sections.map((section) => (
            <div key={section.heading} className="footer-info-section">
              <h2 className="footer-info-heading">{section.heading}</h2>
              <ul className="footer-info-list">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FooterInfoPage;
