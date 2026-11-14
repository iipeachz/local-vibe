# Local Vibe

A demo website for booking hands-on craft workshops with local studios, and for hosting your own.

- **Workshops**: browse classes from Satee.ceramic and Cotton Farm Showroom, filter by date, category or studio.
- **Booking**: choose seats, enter your details, pick card or PromptPay, and get a ticket with a door code.
- **Host**: list a workshop with date, seats, price and cover. The dashboard shows bookings and your payout after the 10% platform fee.

This is a static site (HTML, CSS and JavaScript, no build step). It runs on GitHub Pages as is.

## Demo limits

- Bookings and hosted workshops are saved in the visitor's own browser (`localStorage`). Other visitors don't see them.
- No payment is taken.
- Dates, prices and seat counts in `data.js` are placeholders until each studio confirms them.

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

## Edit the workshops

Change `data.js`. Photos live in `img/`; a 2×2 collage can be cropped per class with `cover: { img, q }` (q = 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right).
