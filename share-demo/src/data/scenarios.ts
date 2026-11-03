import type { Lang, ScenarioId } from "../lib/types";

/** Real Trip.com content — from the Figma Share file (Guideline / Media) and Trip.com iOS screens on Mobbin. */

export const ITINERARY = {
  title: "London & Edinburgh 7-Day Tour: British Museum, Thames River Cruise, Arthur’s Seat Hiking",
  author: "GianGian",
  departure: "Departure date: Jul 30, 2026",
  meta: "Jul 30 – Aug 5 · 2 cities · 17 places",
  days: [
    { date: "Thu, Jul 30", title: "Arrive in London and settle in Bloomsbury", route: [], stay: "Numa London Bloomsbury" },
    {
      date: "Fri, Jul 31",
      title: "Explore British Museum, National Gallery, and West End Theatre",
      route: ["The British Museum", "The National Gallery", "West End theatre"],
      stay: "Stay in London",
    },
    {
      date: "Sat, Aug 1",
      title: "Discover Tower of London, Tower Bridge, Thames River, and London Eye",
      route: ["Tower of London", "Tower Bridge", "Thames River Sightseeing", "London Eye"],
      stay: "Stay in London",
    },
    {
      date: "Sun, Aug 2",
      title: "Visit Kensington Palace, Kyoto Garden, and travel to Edinburgh",
      route: ["Kensington Palace", "Kyoto Garden", "London – Edinburgh"],
      stay: "Stay in Edinburgh",
    },
    {
      date: "Mon, Aug 3",
      title: "Explore Edinburgh Old Town, Palace of Holyroodhouse, and Arthur’s Seat",
      route: ["Edinburgh Old Town", "Palace of Holyroodhouse", "Arthur’s Seat"],
      stay: "Stay in Edinburgh",
    },
    {
      date: "Tue, Aug 4",
      title: "Art and city stroll: National Galleries, Princes Street, Gardens, and Calton Hill",
      route: ["National Galleries of Scotland", "Princes Street", "Princes Street Gardens", "Calton Hill"],
      stay: "Stay in Edinburgh",
    },
    { date: "Wed, Aug 5", title: "Depart Edinburgh for Shanghai", route: [], stay: "" },
  ],
  qrTitle: "Scan the QR code to view the itinerary",
  qrSub: "You can copy this itinerary to share with others",
};

export const FLIGHT = {
  trip: "One-way",
  date: "Fri, Sep 19",
  duration: "7h 50m",
  dep: { time: "16:55", city: "Amsterdam", code: "AMS" },
  arr: { time: "22:50", city: "New York", code: "LGA" },
  airline: "China Eastern Airlines",
  flightNo: "MU1580",
  aircraft: "Airbus A320",
  price: "515",
  posterTitle: "Trip to New York",
  passenger: "Mrs. Jiang",
  support: "24/7 service support",
  qr: "Scan QR code to see more cheap flights",
  noFee: "No hidden fee",
};

export const HOTEL = {
  name: "Cozrum Homes - Charming Corner 2",
  score: "4.1",
  scoreText: "Very Good",
  reviews: "20 reviews",
  address: "453/48 Nguyen Dinh Chieu, Ward 5, District 3, Ho Chi Minh City, Vietnam",
  distance: "1.1 miles from Saigon Train Station, approx. 23 mins by foot",
  amenities: ["Parking", "Luggage storage", "Wi-Fi in public areas"],
  dates: "Mar 17 – Mar 18",
  nights: "1 night",
  room: "Backview · 1 queen bed",
  roomMeta: "193 ft² · Non-smoking",
  price: "15",
  was: "17",
  off: "8% Off",
  cancel: "Free Cancellation before 12:00, Mar 16",
  review: "“Clean room, friendly host and a great location near Ben Thanh.”",
  opened: "Opened: 2020",
};

export const SCENARIOS: Record<
  ScenarioId,
  { label: string; sub: string; shareTitle: Record<Lang, string>; source: string }
> = {
  itinerary: {
    label: "行程 Itinerary",
    sub: "London & Edinburgh 7-Day Tour",
    shareTitle: { en: "Share this itinerary", zh: "分享行程", de: "Reiseplan teilen" },
    source: "Figma · Guideline / Media=scroll",
  },
  flight: {
    label: "机票 Flight",
    sub: "AMS → LGA · MU1580",
    shareTitle: { en: "Share this flight", zh: "分享航班", de: "Flug teilen" },
    source: "Figma · Media=fit",
  },
  hotel: {
    label: "酒店 Hotel",
    sub: "Cozrum Homes · Ho Chi Minh City",
    shareTitle: { en: "Share this hotel", zh: "分享酒店", de: "Hotel teilen" },
    source: "Trip.com iOS · Mobbin",
  },
};
