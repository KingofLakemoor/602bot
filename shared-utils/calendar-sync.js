/**
 * Club 602 Calendar Sync Utility
 * Pulls and parses events from Google Calendar via Firebase.
 * Specifically reads title tags (e.g. [Wine Pairing], [Potluck], [NFL Watch])
 * to route event hype and RSVP alerts to the correct Discord channels.
 */

import { getFirestoreDb } from './firebase-config.js';

/**
 * Extracts bracketed tags from an event title.
 * e.g., "[Wine Pairing] Friendsgiving Dinner & Tasting" => { tags: ['Wine Pairing'], cleanTitle: 'Friendsgiving Dinner & Tasting' }
 */
export function extractTitleTags(title = '') {
  const tagRegex = /\[(.*?)\]/g;
  const tags = [];
  let match;

  while ((match = tagRegex.exec(title)) !== null) {
    tags.push(match[1].trim());
  }

  const cleanTitle = title.replace(tagRegex, '').trim();

  return {
    tags: tags.length > 0 ? tags : ['General Social'],
    cleanTitle
  };
}

/**
 * Parses calendar events from Firestore and determines target alert channel and event hype prompts.
 */
export function parseCalendarEvents(eventsList = []) {
  return eventsList.map((event) => {
    const { tags, cleanTitle } = extractTitleTags(event.title || event.summary || 'Club 602 Gathering');
    const primaryTag = tags[0]?.toLowerCase() || 'general';

    let targetChannel = 'club-602-lounge';
    let hypePrompt = 'Gathering scheduled at Club 602. RSVP with `/rsvp` to reserve your guest pass.';
    let category = 'SOCIAL';

    if (primaryTag.includes('wine') || primaryTag.includes('pairing')) {
      targetChannel = 'wine-collective';
      hypePrompt = `🍷 **Wine Pairing Hype:** Feature pairing for "${cleanTitle}". Consider bringing a bold Cabernet or vintage Pinot Noir to match the tasting menu!`;
      category = 'WINE_PAIRING';
    } else if (primaryTag.includes('potluck') || primaryTag.includes('friendsgiving') || primaryTag.includes('dinner')) {
      targetChannel = 'club-602-kitchen';
      hypePrompt = `🥘 **Potluck Coordination:** "${cleanTitle}" is coming up! Coordinate appetizer, main, or dessert submissions in thread.`;
      category = 'POTLUCK';
    } else if (primaryTag.includes('nfl') || primaryTag.includes('game') || primaryTag.includes('redzone')) {
      targetChannel = 'the-sports-bar';
      hypePrompt = `🏈 **NFL RedZone Watch Party:** "${cleanTitle}" live in the Sky Lounge. Sound on prime screens!`;
      category = 'SPORTS';
    } else if (primaryTag.includes('reality') || primaryTag.includes('rose') || primaryTag.includes('tv')) {
      targetChannel = 'scriptless-lounge';
      hypePrompt = `🍸 **Reality Screening:** "${cleanTitle}" screening & live roast night. Champagne on tap!`;
      category = 'REALITY_TV';
    }

    return {
      ...event,
      cleanTitle,
      tags,
      primaryTag,
      category,
      targetChannel,
      hypePrompt
    };
  });
}

/**
 * Fetches calendar events from Firebase `club602_calendar` collection
 */
export async function getCalendarEventsFromFirebase() {
  const db = getFirestoreDb();
  try {
    const snapshot = await db.collection('club602_calendar').get();
    const events = [];
    snapshot.forEach((doc) => {
      const data = typeof doc.data === 'function' ? doc.data() : doc;
      if (data && doc.id !== 'announcements') {
        events.push({ id: doc.id, ...data });
      }
    });

    if (events.length === 0) {
      return getFallbackCalendarEvents();
    }

    return parseCalendarEvents(events);
  } catch (err) {
    console.warn('[CalendarSync] Firestore fetch failed, using fallback calendar data:', err.message);
    return getFallbackCalendarEvents();
  }
}

function getFallbackCalendarEvents() {
  const rawFallback = [
    {
      id: 'cal-1',
      title: '[Wine Pairing] Fall Reserve Tasting & Friendsgiving',
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      location: 'Club 602 Penthouse Dining Room',
      details: 'Bring a bottle of reserve red for bottle-pairing coordination.'
    },
    {
      id: 'cal-2',
      title: '[Potluck] Friendsgiving Dinner & Member Potluck',
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 120).toISOString(),
      location: 'Club 602 Main Lounge',
      details: 'Sign up for side dishes and dessert pairings.'
    },
    {
      id: 'cal-3',
      title: '[NFL Watch] Sunday RedZone Watch Party & Craft Cocktails',
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      location: 'Sky Lounge Screen 1 & 2',
      details: '8 screens active with live sports action.'
    }
  ];

  return parseCalendarEvents(rawFallback);
}
