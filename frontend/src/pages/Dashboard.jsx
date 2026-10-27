import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import OutfitCard from '../components/OutfitCard.jsx';

const emptyLearnedData = {
  liked: [],
  disliked: [],
};

const emptyDashboard = {
  user: {
    name: 'User',
    profile: {
      styles: [],
    },
  },
  weather: {
    city: 'Unknown',
    tempC: '--',
    condition: 'Unavailable',
    source: 'Unavailable',
  },
  counts: {
    items: 0,
    outfits: 0,
    saved: 0,
    worn: 0,
    likes: 0,
  },
  learned: {
    colors: emptyLearnedData,
    styles: emptyLearnedData,
    groups: emptyLearnedData,
  },
  recommended: [],
  saved: [],
  recentWorn: [],
};

function Learned({ title, data }) {
  const liked = Array.isArray(data?.liked) ? data.liked : [];
  const disliked = Array.isArray(data?.disliked)
    ? data.disliked
    : [];

  return (
    <div className="learned-section">
      <b>{title}</b>

      <div className="chips">
        {liked.map((item, index) => (
          <span
            key={`${item.name}-${index}`}
            className="chip on"
          >
            {item.name} +{Number(item.weight || 0).toFixed(1)}
          </span>
        ))}

        {disliked.map((item, index) => (
          <span
            key={`${item.name}-${index}`}
            className="chip bad"
          >
            {item.name} {Number(item.weight || 0).toFixed(1)}
          </span>
        ))}

        {liked.length === 0 && disliked.length === 0 && (
          <span className="muted">Nothing learned yet</span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');

      // api.get() already returns the response body,
      // because api.js extracts response.data.
      const response = await api.get('/dashboard');

      // Support both direct and wrapped dashboard responses.
      const rawData = response?.data ?? response;

      if (
        !rawData ||
        typeof rawData !== 'object' ||
        Array.isArray(rawData)
      ) {
        throw new Error(
          'The server returned an invalid dashboard response.'
        );
      }

      const result = {
        ...emptyDashboard,
        ...rawData,

        user: {
          ...emptyDashboard.user,
          ...(rawData.user || {}),
          profile: {
            ...emptyDashboard.user.profile,
            ...(rawData.user?.profile || {}),
          },
        },

        weather: {
          ...emptyDashboard.weather,
          ...(rawData.weather || {}),
        },

        counts: {
          ...emptyDashboard.counts,
          ...(rawData.counts || {}),
        },

        learned: {
          ...emptyDashboard.learned,
          ...(rawData.learned || {}),
        },

        recommended: Array.isArray(rawData.recommended)
          ? rawData.recommended
          : [],

        saved: Array.isArray(rawData.saved)
          ? rawData.saved
          : [],

        recentWorn: Array.isArray(rawData.recentWorn)
          ? rawData.recentWorn
          : [],
      };

      setDashboard(result);
    } catch (err) {
      console.error('Dashboard loading error:', err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Could not load the dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <p className="center">Loading dashboard…</p>;
  }

  if (error) {
    return (
      <div className="card">
        <h2>Unable to load your dashboard</h2>

        <p className="muted">{error}</p>

        <button type="button" onClick={loadDashboard}>
          Try again
        </button>
      </div>
    );
  }

  const d = dashboard || emptyDashboard;
  const counts = d.counts || emptyDashboard.counts;
  const userName = d.user?.name || 'User';

  const styles = Array.isArray(d.user?.profile?.styles)
    ? d.user.profile.styles
    : [];

  return (
    <div className="dashboard-page">
      <h2>
        Hi {userName.trim().split(/\s+/)[0]} 👋
      </h2>

      <p className="muted">
        {d.weather.city}: {d.weather.tempC}°C,{' '}
        {d.weather.condition}{' '}
        <small>({d.weather.source})</small>
      </p>

      <div className="stats">
        {[
          ['Items', counts.items],
          ['Outfits generated', counts.outfits],
          ['Saved', counts.saved],
          ['Worn', counts.worn],
          ['Likes', counts.likes],
        ].map(([label, value]) => (
          <div key={label} className="card stat">
            <b>{value ?? 0}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>What the system has learned about you</h3>

        <p className="muted">
          Starts from your profile (
          {styles.length > 0
            ? styles.join(', ')
            : 'no styles set'}
          ) and adapts based on your likes, dislikes, saves,
          and worn outfits.
        </p>

        <Learned
          title="Colors"
          data={d.learned?.colors}
        />

        <Learned
          title="Styles"
          data={d.learned?.styles}
        />

        <Learned
          title="Color families"
          data={d.learned?.groups}
        />
      </div>

      <div className="dashboard-section-heading">
        <h3>Recommended for you</h3>

        <Link className="small" to="/outfits">
          Generate more →
        </Link>
      </div>

      <div className="grid">
        {d.recommended.length > 0 ? (
          d.recommended.map((outfit, index) => (
            <OutfitCard
              key={outfit._id || outfit.id || index}
              outfit={outfit}
            />
          ))
        ) : (
          <p className="muted">
            No pending recommendations. Head to Outfits
            to generate some.
          </p>
        )}
      </div>

      <h3>Saved outfits</h3>

      <div className="grid">
        {d.saved.length > 0 ? (
          d.saved.map((outfit, index) => (
            <OutfitCard
              key={outfit._id || outfit.id || index}
              outfit={outfit}
            />
          ))
        ) : (
          <p className="muted">
            You haven't saved any outfits yet.
          </p>
        )}
      </div>

      <h3>Recently worn</h3>

      <div className="grid">
        {d.recentWorn.length > 0 ? (
          d.recentWorn.map((outfit, index) => (
            <OutfitCard
              key={outfit._id || outfit.id || index}
              outfit={outfit}
            />
          ))
        ) : (
          <p className="muted">
            Your recently worn outfits will appear here.
          </p>
        )}
      </div>
    </div>
  );
}