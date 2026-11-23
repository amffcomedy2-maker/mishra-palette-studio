# Mishra Palette Studio

Build a fully functional, ultra-premium, paid-agency quality Web Application for a professional wall painting contractor named "Mishra Painters". The application must have two connected parts: a public User Panel (with zero login/signup for visitors) and a secret PIN-protected Admin Panel connected via a real-time persistent database so anything posted or edited by the admin goes live immediately for all visitors.

==================================================
1. DESIGN & VISUAL IDENTITY (LUXURY PAID THEME)
==================================================
- Theme: Royal Dark Luxury (Deep Midnight Navy/Charcoal #0B1120 background, Rich Metallic Gold #D4AF37 & #F5D061 accents, sleek glassmorphism cards, warm ivory text #F8FAFC).
- Typography: Use Google Fonts — "Cinzel" or "Playfair Display" for luxury English headings, "Noto Sans Devanagari" for sharp Hindi text, and "Inter" for clean UI elements.
- Mobile-First & Responsive: Designed primarily for clients opening the link from WhatsApp on smartphones, while looking equally sharp on desktop.
- Iframe Embeddable: Ensure the app works smoothly when embedded inside an <iframe> on another website (do not apply restrictive frame-blocking logic in the app).

==================================================
2. USER PANEL (PUBLIC HOME ROUTE: "/")
==================================================
CRITICAL RULE: There must be NO login, NO signup, NO registration, and NO visible "Admin" link on the public website. Anyone opening the URL sees the full site immediately.

SECTION A: PREMIUM DIGITAL VISITING CARD (HERO SECTION)
Design a realistic, embossed, luxury VIP Digital Visiting Card right at the top of the page with subtle metallic gold borders and shadow depth. Display the following exact details cleanly:
- Top Center Devotional Header (in Hindi): "॥ जय श्री श्याम ॥"
- Business Name: "Mishra Painters"
- Proprietor: "Pro. Amit Mishra"
- Experience Badge: Display an authentic Experience highlight (default: "20+ Years of Experience" — must be dynamically editable from the Admin Panel).
- Services / Works Listed on Card:
  "मकान में सुंदर एवं आकर्षक पेंटिंग, वॉल पुट्टी, प्लास्टिक पेंट, रॉयल प्ले, वॉल टेक्सचर एवं फर्नीचर पॉलिश इत्यादि... के लिए संपर्क करें।"
- Calling Number: +91 9217672275
- WhatsApp Number: +91 7488650236
- Address: Sector 105, Gurgaon

ACTION BUTTONS DIRECTLY BELOW THE VISITING CARD:
1. "Download Visiting Card" Button (Primary Gold CTA): Uses high-resolution DOM-to-Image rendering (html2canvas at 3x scale) to instantly download the styled visiting card design cleanly as "Mishra-Painters-Visiting-Card.png" on both mobile and desktop.
2. "WhatsApp Now" Button: Opens direct WhatsApp chat to https://wa.me/917488650236?text=Namaste%20Amit%20ji%2C%20mujhe%20painting%20work%20ke%20baare%20me%20jaankari%20chahiye
3. "Call Now" Button: Direct dialer link tel:+919217672275
4. "Save Contact" Button: Generates and downloads a .vcf (vCard) file saving "Amit Mishra - Mishra Painters" with Calling number (9217672275), WhatsApp number (7488650236), and address (Sector 105, Gurgaon).

SECTION B: LIVE ORIGINAL WORK PORTFOLIO (SCROLL DOWN)
Below the visiting card, display the contractor's original completed work fetched live from the database:
- Clean Filter Tabs: "All Work", "Work Photos", "Reels & Videos" (plus optional category filter tags: Painting, Wall Putty, Plastic Paint, Royal Play, Wall Texture, Furniture Polish).
- Original Photos Grid:
  - Displays full-quality original images loaded directly from ImgBB URLs (zero local storage load).
  - Directly beneath EVERY photo, clearly show the Work Title / Name (and optional short description/category tag) in a clean luxury card footer.
  - Clicking any photo opens a full-screen HD Lightbox modal with a "Ask About This Work on WhatsApp" button that pre-fills the work title in the WhatsApp message to 7488650236.
- Facebook Reels & Posts Showcase (Reel-Style Player):
  - Displays Facebook Reels and Facebook Posts added via the Admin Panel.
  - Supports BOTH raw Facebook <iframe> embed codes AND standard Facebook Reel/Post share URLs (automatically converting Facebook URLs into responsive Facebook video/post embed iframes).
  - Vertical Reels should render in an authentic, sleek vertical 9:16 Reel-style card layout with the Work Title displayed neatly below each reel, so users can watch them directly on the website.
  - Also supports direct video playback if hosted via an external video API (like Cloudinary).

SECTION C: FLOATING DIRECT CONTACT BUTTONS
- Keep sleek floating quick-action buttons fixed at the bottom-right corner: one for WhatsApp (7488650236) and one for Direct Call (9217672275).

STRICT EXCLUSIONS (DO NOT INCLUDE THESE FEATURES):
- DO NOT add a Before/After comparison slider.
- DO NOT add a Quote Calculator or Cost Estimator form.
- DO NOT add fake project counter stats (like "300+ Projects Done" or "500+ Happy Clients").
- DO NOT add third-party paint brand logos (no Asian Paints, Berger, Nerolac, Dulux, etc.).
- DO NOT add public user login, signup, comments, or public upload forms.

==================================================
3. SECRET ADMIN PANEL (ROUTE: "/admin-mishra")
==================================================
- Accessible only by typing "/admin-mishra" in the URL.
- Protected by a clean PIN Lock Screen (Default PIN: "1050", changeable inside Admin Settings).
- Mobile-friendly dashboard so the contractor (Amit Mishra) can operate everything easily from his phone.

ADMIN PANEL TABS & FEATURES:

TAB 1: UPLOAD PHOTO WORK (ImgBB Multi-API Powered)
- Form fields: Select Image from device, Work Title / Name (required), Category (Painting, Wall Putty, Plastic Paint, Royal Play, Wall Texture, Furniture Polish), Optional short note.
- Upload Flow: Uploads the selected image directly to the active ImgBB API key (POST to https://api.imgbb.com/1/upload). If multiple ImgBB API keys are added and the primary key fails or hits a rate limit, automatically failover to the next active ImgBB API key.
- Saves ONLY the returned original ImgBB image URL + metadata to the database. Immediately visible on the public User Panel.

TAB 2: ADD FACEBOOK REEL / POST / VIDEO
- Toggle between:
  1. "Facebook Reel / Post Embed": Textarea where admin can paste EITHER the full Facebook <iframe> embed code OR simply paste a normal Facebook Reel/Post link. Include a live preview box before publishing.
  2. "Direct Video Upload (Cloudinary / Connected Video API)": If a Cloudinary or video API is connected in the API Manager, allow uploading video directly and saving its hosted URL.
- Add Work Title / Name and Category. One-click "Publish Live" button.

TAB 3: MANAGE LIVE POSTS
- List of all live photos, Facebook reels/posts, and videos.
- Options to Edit Work Title/Category, Hide/Show toggle, or Delete any post permanently (changes reflect instantly on the User Panel).

TAB 4: MULTI-API MANAGER (CONNECT & MANAGE MULTIPLE APIS)
Create a dedicated, dynamic "API Integrations Manager" section inside the Admin Panel where the admin can add, save, test, enable/disable, and delete multiple APIs without editing any code:
- Support adding MULTIPLE API entries in a list, each with:
  - Custom Label (e.g., "ImgBB Account 1", "ImgBB Backup 2", "Cloudinary Video", "Custom API")
  - Service Type dropdown: "ImgBB (Image Hosting)", "Cloudinary (Video & Image Hosting)", "Custom REST API / Webhook"
  - API Key / Secret / Cloud Name / Upload Preset fields (adapting dynamically based on selected service type)
  - Status Toggle (Active / Inactive) + Priority / Default selector
  - "Test Connection" button to verify the API key is valid
  - Edit & Delete buttons
- Persist all configured APIs securely in the database so uploads always use the currently active connected APIs.

TAB 5: VISITING CARD & SITE SETTINGS
- Editable fields for: Devotional Header ("जय श्री श्याम"), Business Name ("Mishra Painters"), Proprietor Name ("Amit Mishra"), Experience Text (e.g., "15+ Years of Experience"), Services/Works text, Calling Number ("9217672275"), WhatsApp Number ("7488650236"), Address ("Sector 105, Gurgaon"), and Change Admin PIN.
- Saving updates immediately updates both the live Visiting Card on the User Panel and the downloadable Visiting Card PNG.

==================================================
4. TECHNICAL REQUIREMENTS
==================================================
- Connect Frontend and Admin Panel with a real-time database (Supabase / Firebase / Platform built-in DB) so posts, API configurations, and visiting card edits persist permanently across all devices.
- Pre-populate the database with the exact Mishra Painters visiting card details provided above so the site looks complete and ready out-of-the-box on first load.
- Add clean loading states, upload progress bars (for ImgBB uploads), and clear success/error toast notifications in simple English/Hindi friendly wording.    NOTE- use viralplay-theme.zip type theme and animations don't use viralplay-theme.zip any script, text, cotagrys, name only use that type theme and animations. add light and dark theme switch botton that actully works. add laungvage switch botton that actully translate website and change launvage (using google gemini api). add google gemini multiable api adding feature in admin panel that actully works.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mishra-palette-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/284a8fb2-01f2-4d61-a583-315b40e61023).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
