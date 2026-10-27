import { Router } from 'express';

import Item from '../models/Item.js';
import Outfit from '../models/Outfit.js';

import { auth, wrap } from '../middleware/auth.js';

import {
  generate,
  OCCASIONS,
  isOccasionSuitable,
} from '../services/engine.js';

import { getWeather } from '../services/weather.js';

import {
  applyFeedback,
  emptyPrefs,
} from '../services/preferences.js';

const r = Router();

/**
 * Generate outfits and save them to the database.
 */
export async function generateAndStore(
  user,
  {
    occasion = 'casual',
    weather,
    avoid = [],
    mustInclude = [],
    count = 3,
    source = 'engine',
    prompt,
  }
) {
  const items = await Item.find({
    user: user._id,
    archived: false,
  }).lean();

  const history = await Outfit.find({
    user: user._id,
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const results = generate({
    items,
    user: user.toObject(),
    occasion,
    weather,
    avoid,
    mustInclude,
    count,
    history,
  });

  if (!results.length) {
    return [];
  }

  const docs = await Outfit.insertMany(
    results.map((outfit) => ({
      user: user._id,
      items: outfit.itemIds,
      occasion,
      weather,
      score: outfit.score,
      breakdown: outfit.breakdown,
      reasons: outfit.reasons,
      signature: outfit.signature,
      source,
      prompt,
    }))
  );

  const saved = await Outfit.find({
    _id: {
      $in: docs.map((doc) => doc._id),
    },
  })
    .sort({ score: -1 })
    .populate('items');

  return saved;
}

/**
 * Return available occasions.
 */
r.get('/occasions', (req, res) => {
  res.json(
    Object.entries(OCCASIONS).map(([key, value]) => ({
      key,
      label: value.label,
    }))
  );
});

/**
 * Get weather information.
 */
r.get(
  '/weather',
  auth,
  wrap(async (req, res) => {
    const city = req.query.city || req.user.profile.city;

    res.json(await getWeather(city));
  })
);

/**
 * Generate outfits through the regular outfit endpoint.
 */
r.post(
  '/generate',
  auth,
  wrap(async (req, res) => {
    const {
      occasion = 'casual',
      city,
      avoidColors = [],
      mustInclude = [],
      count = 3,
      tempC,
    } = req.body;

    const itemCount = await Item.countDocuments({
      user: req.user._id,
      archived: false,
    });

    if (itemCount < 3) {
      return res.status(400).json({
        error:
          'Add at least a few clothing items first. A top, a bottom and shoes work best.',
      });
    }

    let weather = await getWeather(
      city || req.user.profile.city
    );

    if (typeof tempC === 'number') {
      weather = {
        ...weather,
        tempC,
        source: 'manual',
      };
    }

    const outfits = await generateAndStore(req.user, {
      occasion,
      weather,
      avoid: avoidColors,
      mustInclude: mustInclude.map((id) => [id]),
      count: Math.min(Math.max(Number(count) || 3, 1), 6),
    });

    const hasFallback = outfits.some((outfit) =>
      (outfit.reasons || []).some((reason) =>
        String(reason).toLowerCase().includes('wardrobe fallback')
      )
    );

    res.json({
      weather,
      outfits,
      hasFallback,
      message: hasFallback
        ? 'Some recommendations may be less suitable for this occasion because your wardrobe has limited options.'
        : null,
    });
  })
);

/**
 * Retrieve saved, worn or liked outfits.
 */
r.get(
  '/',
  auth,
  wrap(async (req, res) => {
    const query = {
      user: req.user._id,
    };

    const { filter } = req.query;

    if (filter === 'saved') {
      query['status.saved'] = true;
    }

    if (filter === 'worn') {
      query['wornDates.0'] = {
        $exists: true,
      };
    }

    if (filter === 'liked') {
      query['status.liked'] = true;
    }

    res.json(
      await Outfit.find(query)
        .sort({ updatedAt: -1 })
        .limit(60)
        .populate('items')
    );
  })
);

/**
 * Learn from outfit feedback.
 */
r.post(
  '/:id/feedback',
  auth,
  wrap(async (req, res) => {
    const { action } = req.body;

    const outfit = await Outfit.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('items');

    if (!outfit) {
      return res.status(404).json({
        error: 'Outfit not found.',
      });
    }

    const items = outfit.items.map((item) => item.toObject());

    const prefs = req.user.prefs || emptyPrefs();

    let learn = null;

    if (action === 'like' && !outfit.status.liked) {
      outfit.status.liked = true;
      outfit.status.disliked = false;
      learn = 'like';
    } else if (
      action === 'dislike' &&
      !outfit.status.disliked
    ) {
      outfit.status.disliked = true;
      outfit.status.liked = false;
      learn = 'dislike';
    } else if (action === 'save') {
      if (!outfit.status.saved) {
        learn = 'save';
      }

      outfit.status.saved = true;
    } else if (action === 'unsave') {
      if (outfit.status.saved) {
        learn = 'unsave';
      }

      outfit.status.saved = false;
    } else if (action === 'worn') {
      outfit.wornDates.push(new Date());

      learn = 'worn';

      await Item.updateMany(
        {
          _id: {
            $in: outfit.items.map((item) => item._id),
          },
          user: req.user._id,
        },
        {
          $inc: {
            timesWorn: 1,
          },
          $set: {
            lastWorn: new Date(),
          },
        }
      );
    } else if (!['like', 'dislike'].includes(action)) {
      return res.status(400).json({
        error: 'Unknown feedback action.',
      });
    }

    if (learn) {
      applyFeedback(prefs, items, learn);

      req.user.prefs = prefs;
      req.user.markModified('prefs');

      await req.user.save();
    }

    await outfit.save();

    res.json({
      outfit: await Outfit.findById(outfit._id).populate('items'),
      prefs: req.user.prefs,
      learned: Boolean(learn),
    });
  })
);

export default r;