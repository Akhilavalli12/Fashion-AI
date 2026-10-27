import { useState, useEffect, useRef } from 'react';
import OutfitCard from '../components/OutfitCard.jsx';
import api from '../api.js';

function retailerLinks(query) {
  const encoded = encodeURIComponent(query);

  return [
    {
      name: 'Amazon India',
      url: `https://www.amazon.in/s?k=${encoded}`,
    },
    {
      name: 'Myntra',
      url: `https://www.myntra.com/${encoded}`,
    },
  ];
}

function getShoppingSuggestions(occasion, budget) {
  const catalog = {
    presentation: [
      { name: 'Formal Shirt', search: 'women formal shirt', minPrice: 399, maxPrice: 899 },
      { name: 'Formal Trousers', search: 'women formal trousers', minPrice: 499, maxPrice: 1199 },
      { name: 'Formal Blazer', search: 'women formal blazer', minPrice: 999, maxPrice: 2499 },
      { name: 'Formal Shoes', search: 'women formal office shoes', minPrice: 599, maxPrice: 1499 },
    ],
    college: [
      { name: 'Casual Top', search: 'women casual tops', minPrice: 299, maxPrice: 799 },
      { name: 'Straight Fit Jeans', search: 'women straight fit jeans', minPrice: 599, maxPrice: 1299 },
      { name: 'Sneakers', search: 'women casual sneakers', minPrice: 699, maxPrice: 1499 },
      { name: 'Everyday Bag', search: 'women everyday college bag', minPrice: 399, maxPrice: 999 },
    ],
    party: [
      { name: 'Party Top', search: 'women party wear tops', minPrice: 399, maxPrice: 999 },
      { name: 'Party Dress', search: 'women party wear dresses', minPrice: 699, maxPrice: 1799 },
      { name: 'Heels', search: 'women party heels', minPrice: 599, maxPrice: 1499 },
      { name: 'Statement Accessories', search: 'women statement fashion accessories', minPrice: 199, maxPrice: 699 },
    ],
    wedding: [
      { name: 'Ethnic Wear', search: 'women wedding guest ethnic wear', minPrice: 999, maxPrice: 2999 },
      { name: 'Ethnic Footwear', search: 'women ethnic footwear', minPrice: 499, maxPrice: 1299 },
      { name: 'Jewellery', search: 'women traditional jewellery set', minPrice: 299, maxPrice: 999 },
      { name: 'Clutch Bag', search: 'women ethnic clutch bag', minPrice: 299, maxPrice: 899 },
    ],
    interview: [
      { name: 'Formal Shirt', search: 'women formal shirt interview', minPrice: 399, maxPrice: 899 },
      { name: 'Formal Trousers', search: 'women formal trousers office', minPrice: 499, maxPrice: 1199 },
      { name: 'Blazer', search: 'women formal blazer interview', minPrice: 999, maxPrice: 2499 },
      { name: 'Formal Flats', search: 'women formal flats office wear', minPrice: 399, maxPrice: 999 },
    ],
    casual: [
      { name: 'Casual T-Shirt', search: 'women casual t shirts', minPrice: 249, maxPrice: 599 },
      { name: 'Everyday Jeans', search: 'women everyday jeans', minPrice: 599, maxPrice: 1299 },
      { name: 'Sneakers', search: 'women casual sneakers', minPrice: 699, maxPrice: 1499 },
      { name: 'Everyday Bag', search: 'women casual shoulder bag', minPrice: 399, maxPrice: 999 },
    ],
    date: [
      { name: 'Elegant Top', search: 'women elegant date night tops', minPrice: 399, maxPrice: 999 },
      { name: 'Midi Dress', search: 'women date night midi dress', minPrice: 699, maxPrice: 1799 },
      { name: 'Heels', search: 'women elegant heels', minPrice: 599, maxPrice: 1499 },
      { name: 'Handbag', search: 'women elegant handbag', minPrice: 499, maxPrice: 1299 },
    ],
  };

  const items = catalog[occasion] || catalog.casual;
  const budgetValue = Number(budget);

  if (!Number.isFinite(budgetValue) || budgetValue <= 0) {
    return items;
  }

  const affordableItems = items.filter(
    (item) => item.minPrice <= budgetValue
  );

  return affordableItems.length > 0 ? affordableItems : items;
}

function detectOccasion(text) {
  const value = text.toLowerCase();

  if (/\b(presentation|seminar|conference|viva)\b/.test(value)) {
    return 'presentation';
  }

  if (/\b(interview|placement)\b/.test(value)) {
    return 'interview';
  }

  if (/\b(wedding|marriage|reception|engagement)\b/.test(value)) {
    return 'wedding';
  }

  if (/\b(party|birthday|club)\b/.test(value)) {
    return 'party';
  }

  if (/\b(date night|date)\b/.test(value)) {
    return 'date';
  }

  if (/\b(college|university|campus|lecture)\b/.test(value)) {
    return 'college';
  }

  if (/\b(casual|everyday|hangout|outing)\b/.test(value)) {
    return 'casual';
  }

  return null;
}

function detectBudget(text) {
  const value = text.toLowerCase();

  const patterns = [
    /₹\s?(\d{3,6})/,
    /\binr\s?(\d{3,6})\b/i,
    /\bbudget\s*(?:of|is|:)?\s*₹?\s*(\d{3,6})\b/i,
    /\bunder\s*₹?\s*(\d{3,6})\b/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function ShoppingSuggestions({ occasion, budget }) {
  const suggestions = getShoppingSuggestions(occasion, budget);

  const occasionLabels = {
    presentation: 'Presentation / Seminar',
    college: 'College',
    party: 'Party',
    wedding: 'Wedding Guest',
    interview: 'Interview',
    casual: 'Casual',
    date: 'Date Night',
  };

  return (
    <section className="shopping-suggestions">
      <div className="shopping-heading">
        <div>
          <span className="shopping-eyebrow">
            WARDROBE GAP SHOPPING
          </span>

          <h3>Complete Your Outfit</h3>

          <p>
            Suggested essentials for your{' '}
            {occasionLabels[occasion] || 'occasion'}.
          </p>
        </div>

        <span className="shopping-bag-icon">🛍️</span>
      </div>

      <div className="shopping-grid">
        {suggestions.map((item) => (
          <article className="shopping-item" key={item.name}>
            <div className="shopping-item-top">
              <div className="shopping-item-icon">👗</div>

              <span className="shopping-tag">Suggested</span>
            </div>

            <h4>{item.name}</h4>

            <p className="shopping-price">
              ₹{item.minPrice} – ₹{item.maxPrice}
            </p>

            <p className="shopping-price-note">
              Estimated price range
            </p>

            <div className="shopping-retailers">
              {retailerLinks(item.search).map((retailer) => (
                <a
                  key={retailer.name}
                  href={retailer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shopping-retailer-link"
                >
                  {retailer.name} <span>↗</span>
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="shopping-disclaimer">
        Prices are estimates, not live product prices. Check the
        retailer's website for current prices, sizes, availability,
        and delivery details.
      </p>
    </section>
  );
}

export default function Stylist() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shoppingContext, setShoppingContext] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, loading]);

  async function sendMessage(event) {
    event?.preventDefault();

    const text = input.trim();

    if (!text || loading) {
      return;
    }

    setInput('');
    setError('');

    setMessages((previous) => [
      ...previous,
      {
        role: 'user',
        content: text,
      },
    ]);

    const detectedOccasion = detectOccasion(text);
    const detectedBudget = detectBudget(text);

    if (detectedOccasion) {
      setShoppingContext({
        occasion: detectedOccasion,
        budget: detectedBudget,
      });
    }

    setLoading(true);

    try {
      // api.post() returns the response body directly.
      const data = await api.post('/stylist/chat', {
        message: text,
      });

      const reply =
        data?.reply ||
        data?.message ||
        data?.advice ||
        'I could not generate a response. Please try again.';

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: reply,
          outfits: Array.isArray(data?.outfits)
            ? data.outfits
            : [],
        },
      ]);

      if (
        !detectedOccasion &&
        /\b(shopping|shop|buy|purchase|wardrobe|missing item|complete my outfit)\b/i.test(text)
      ) {
        setShoppingContext((previous) => ({
          occasion: previous?.occasion || 'casual',
          budget: detectedBudget ?? previous?.budget ?? null,
        }));
      }
    } catch (err) {
      console.error(
        'Stylist chat error:',
        err.response?.data || err
      );

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Could not connect to the stylist. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="stylist-page">
      <section className="stylist-header">
        <div>
          <span className="stylist-eyebrow">
            YOUR PERSONAL FASHION ASSISTANT
          </span>

          <h1>StyleSense Stylist</h1>

          <p>
            Get outfit advice, style recommendations, and shopping
            suggestions for your occasion.
          </p>
        </div>
      </section>

      <section className="stylist-chat">
        <div className="stylist-messages">
          {messages.length === 0 && (
            <div className="stylist-welcome">
              <div className="stylist-welcome-icon">✨</div>

              <h2>Let's find your style.</h2>

              <p>
                Tell me where you're going, what you own, or what
                kind of outfit you need.
              </p>

              <div className="stylist-prompts">
                {[
                  'Suggest an outfit for a college presentation.',
                  'Help me choose an interview outfit.',
                  'Suggest a casual college outfit.',
                  'Help me shop for a party outfit under ₹2000.',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              className={`stylist-message ${message.role}`}
              key={`${message.role}-${index}`}
            >
              <div className="stylist-message-label">
                {message.role === 'user' ? 'YOU' : 'STYLESENSE'}
              </div>

              <div className="stylist-message-content">
                {message.content}
              </div>

              {message.outfits?.map((outfit, outfitIndex) => (
                <OutfitCard
                  key={outfit._id || outfit.id || outfitIndex}
                  outfit={outfit}
                />
              ))}
            </div>
          ))}

          {loading && (
            <div className="stylist-typing">
              <span />
              <span />
              <span />
              <p>Styling your look...</p>
            </div>
          )}

          {error && (
            <div className="stylist-error" role="alert">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {shoppingContext && (
          <ShoppingSuggestions
            occasion={shoppingContext.occasion}
            budget={shoppingContext.budget}
          />
        )}

        <form
          className="stylist-input-form"
          onSubmit={sendMessage}
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about outfits, occasions, or shopping..."
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
          >
            {loading ? 'Thinking...' : 'Send ↗'}
          </button>
        </form>
      </section>
    </main>
  );
}