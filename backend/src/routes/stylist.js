import { Router } from 'express';

import Item from '../models/Item.js';
import Message from '../models/Message.js';

import { auth, wrap } from '../middleware/auth.js';

import { understand } from '../services/stylist.js';

import {
  OCCASIONS,
} from '../services/engine.js';

import { getWeather } from '../services/weather.js';

import { generateAndStore } from './outfits.js';

const r = Router();

/**
 * Conversation history.
 */
r.get(
  '/history',
  auth,
  wrap(async (req, res) => {
    res.json(
      await Message.find({
        user: req.user._id,
      })
        .sort({ createdAt: 1 })
        .limit(80)
        .populate({
          path: 'outfits',
          populate: {
            path: 'items',
          },
        })
    );
  })
);

/**
 * Build a useful explanation when the wardrobe does not
 * contain an appropriate outfit for the requested occasion.
 */
function getFallbackAdvice(occasion, items, temperature) {
  const coreItems = items.filter((item) =>
    ['Top', 'Bottom', 'Dress'].includes(item.category)
  );

  const formalTops = coreItems.filter(
    (item) =>
      item.category === 'Top' &&
      ['Smart Casual', 'Semi-Formal', 'Formal'].includes(
        item.formality
      )
  );

  const formalBottoms = coreItems.filter(
    (item) =>
      item.category === 'Bottom' &&
      ['Smart Casual', 'Semi-Formal', 'Formal'].includes(
        item.formality
      )
  );

  const formalDresses = coreItems.filter(
    (item) =>
      item.category === 'Dress' &&
      ['Smart Casual', 'Semi-Formal', 'Formal'].includes(
        item.formality
      )
  );

  const suggestions = [];

  if (
    ['presentation', 'office', 'interview'].includes(occasion)
  ) {
    if (!formalTops.length && !formalDresses.length) {
      suggestions.push(
        'a smart-casual or formal shirt, blouse, or dress'
      );
    }

    if (!formalBottoms.length && !formalDresses.length) {
      suggestions.push(
        'tailored trousers or another smart-casual bottom'
      );
    }

    if (temperature >= 30) {
      suggestions.push(
        'lightweight, breathable fabrics suitable for hot weather'
      );
    }
  }

  if (['wedding', 'festival'].includes(occasion)) {
    const traditionalItems = coreItems.filter(
      (item) =>
        ['Traditional', 'Elegant'].includes(item.style) ||
        ['Semi-Formal', 'Formal'].includes(item.formality)
    );

    if (!traditionalItems.length) {
      suggestions.push(
        'an elegant or traditional outfit appropriate for the event'
      );
    }
  }

  if (!suggestions.length) {
    suggestions.push(
      'one or two versatile pieces that better suit the requested occasion'
    );
  }

  return suggestions;
}

/**
 * Handle stylist chat.
 */
r.post(
  '/chat',
  auth,
  wrap(async (req, res) => {
    const text = String(req.body.message || '').trim();

    if (!text) {
      return res.status(400).json({
        error: 'Please enter a message.',
      });
    }

    await Message.create({
      user: req.user._id,
      role: 'user',
      text,
    });

    const items = await Item.find({
      user: req.user._id,
      archived: false,
    }).lean();

    const c = await understand(text, items);

    let reply;
    let outfits = [];

    if (c.intent === 'summary') {
      const byCategory = {};

      items.forEach((item) => {
        byCategory[item.category] =
          (byCategory[item.category] || 0) + 1;
      });

      const breakdown = Object.entries(byCategory)
        .map(
          ([category, amount]) =>
            `${amount} ${category.toLowerCase()}`
        )
        .join(', ');

      reply = `You own ${items.length} items${
        breakdown ? `: ${breakdown}` : ''
      }.`;
    } else if (c.intent === 'unworn') {
      const unworn = items
        .filter((item) => !item.timesWorn)
        .slice(0, 8);

      reply = unworn.length
        ? `Pieces you haven't worn yet: ${unworn
            .map((item) => item.name)
            .join(', ')}. Ask me to build an outfit around one!`
        : 'You have worn everything at least once. Nice rotation!';
    } else if (items.length < 3) {
      reply =
        'Your wardrobe needs a few more items before I can build complete outfits. Start by adding a top, a bottom and footwear.';
    } else if (c.missing.length && !c.mustInclude.length) {
      reply = `I couldn't find ${c.missing
        .map((item) => `"${item}"`)
        .join(', ')} in your wardrobe. You can add those pieces in the Upload tab, or ask me to suggest an alternative using what you already own.`;
    } else {
      const occasion = c.occasion || 'casual';

      let weather = await getWeather(
        req.user.profile.city
      );

      if (c.weatherHint) {
        weather = {
          ...weather,
          ...c.weatherHint,
          source: 'from your message',
        };
      }

      outfits = await generateAndStore(req.user, {
        occasion,
        weather,
        avoid: c.avoidColors,
        mustInclude: c.mustInclude,
        count: 3,
        source: 'stylist',
        prompt: text,
      });

      const bits = [];

      if (c.occasion) {
        bits.push(
          `for ${OCCASIONS[occasion]?.label?.toLowerCase() || occasion}`
        );
      }

      if (c.notes.length) {
        bits.push(`built around ${c.notes.join(' + ')}`);
      }

      if (c.avoidColors.length) {
        bits.push(
          `avoiding ${c.avoidColors.join(', ').toLowerCase()}`
        );
      }

      bits.push(
        `${weather.tempC}°C ${weather.condition}`
      );

      if (!outfits.length) {
        reply =
          `I couldn't assemble a complete outfit ${bits.join(
            ' · '
          )}. Your current wardrobe or requested constraints may be limiting the options. ` +
          'Try removing a required item or relaxing a colour restriction.';
      } else {
        const occasionLabel =
          OCCASIONS[occasion]?.label || occasion;

        const isFormalOccasion = [
          'presentation',
          'office',
          'interview',
          'wedding',
          'festival',
        ].includes(occasion);

        const fallbackReasons = outfits.filter((outfit) =>
          (outfit.reasons || []).some((reason) =>
            String(reason)
              .toLowerCase()
              .includes('wardrobe fallback')
          )
        );

        if (
          isFormalOccasion &&
          fallbackReasons.length > 0
        ) {
          const suggestions = getFallbackAdvice(
            occasion,
            items,
            weather.tempC
          );

          reply =
            `I found ${outfits.length} possible outfit ${
              outfits.length === 1 ? 'combination' : 'combinations'
            } ${bits.join(' · ')}, but your wardrobe doesn't currently have a complete combination that meets my minimum requirements for ${occasionLabel.toLowerCase()}. ` +
            'These are fallback options, so treat them as the closest available alternatives rather than ideal recommendations. ' +
            `To improve your options, consider adding ${suggestions.join(
              ', '
            )}.`;
        } else {
          reply =
            `Here ${
              outfits.length === 1
                ? 'is 1 outfit'
                : `are ${outfits.length} outfits`
            } ${bits.join(' · ')}.`;

          if (c.missing.length) {
            reply +=
              ` I couldn't find ${c.missing.join(
                ', '
              )} in your wardrobe, so these suggestions use the available alternatives.`;
          }
        }
      }
    }

    const msg = await Message.create({
      user: req.user._id,
      role: 'assistant',
      text: reply,
      outfits: outfits.map((outfit) => outfit._id),
      meta: {
        parser: c.parser,
        constraints: {
          occasion: c.occasion,
          avoid: c.avoidColors,
        },
      },
    });

    res.json({
      reply,
      outfits,
      parser: c.parser,
      id: msg._id,
    });
  })
);

export default r;