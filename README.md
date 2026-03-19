<h1>Video Game Library Oragnizer/ Database</h1>

<img src="public/logo192.png"  height="200" width="200" />

<p>
A full-stack video game discovery and library management platform built with <strong>React</strong>, powered by the <strong>RAWG Video Game Database API</strong>, and backed by <strong>Firebase</strong> for authentication and data storage. 

The application enables users to organize their game collections across multiple platforms using custom groups, while offering powerful tools such as image-based scanning with OCR, AI-assisted text processing, manual text importing, and Steam account synchronization to quickly build and manage their library.

In addition to organization, the platform provides advanced search and filtering by title, genre, platform, and tags, along with intelligent game ranking based on Metacritic scores to highlight top-rated titles. Users can explore detailed game pages with rich metadata, dynamic backgrounds, and real-time data, while also viewing current pricing and store availability through integrated third-party APIs.

With features like persistent search state, highlighted top results, and smooth pagination, the app delivers a seamless and immersive experience for discovering, tracking, and managing games across both physical and digital collections.
</p>

<h2>Features</h2>
<ul>
  <li><strong>Secure User Authentication</strong> – Account creation and login powered by Firebase Authentication</li>

  <li><strong>Custom Game Organization</strong> – Create and manage personalized groups to organize your game library your way</li>

  <li><strong>Fast Game Importing</strong> – Add games instantly through:
    <ul>
      <li>Image scanning (physical collections)</li>
      <li>Text input</li>
      <li>Steam account synchronization</li>
    </ul>
  </li>

  <li><strong>Real-Time Game Data</strong> – Integrated with the RAWG API to fetch up-to-date game details, images, and metadata</li>

  <li><strong>Advanced Search & Filtering</strong> – Search games by title, platform, genre, or tags for quick discovery</li>

  <li><strong>Smart Game Ranking</strong> – Games are automatically sorted by Metacritic score to highlight top-rated titles first</li>

  <li><strong>Interactive Game Pages</strong> – Detailed pages for each game including stats, genres, platforms, and release information</li>

  <li><strong>Dynamic Visual Experience</strong> – Backgrounds adapt based on the selected game for a more immersive UI</li>

  <li><strong>Top Picks Highlighting</strong> – Top 3 results are visually ranked with Gold, Silver, and Bronze indicators</li>

  <li><strong>Persistent Search State</strong> – Last search is saved using local storage for a seamless user experience</li>

  <li><strong>Efficient Pagination</strong> – Built-in pagination for smooth browsing through large game libraries</li>
</ul>

<h3>API's / Services Used</h3>

This project integrates multiple APIs to power game discovery, scanning, and library management:

- **RAWG API**  
  Used to search and retrieve video game data including titles, images, and metadata.

- **Google Cloud Vision API**  
  Extracts text from uploaded images (e.g., scanning physical game collections).

- **OpenAI (GPT-4o-mini)**  
  Processes OCR results to intelligently extract and clean video game titles from raw text.

- **Steam Web API**  
  Allows users to connect their Steam account and import owned games.

<a href="https://jade-begonia-31d074.netlify.app/">Visit the Site</a>

<h2>Tech Stack</h2>
<ul>
  <li><strong>Frontend:</strong> HTML, CSS, JavaScript, React</li>
  
  <li><strong>Backend:</strong> Node.js, Express</li>
  
  <li><strong>Database & Auth:</strong> Firebase (Authentication & Firestore)</li>
  
  <li><strong>APIs & Integrations:</strong>
    <ul>
      <li>RAWG API – Game data and metadata</li>
      <li>Google Cloud Vision API – Image-to-text (OCR) scanning</li>
      <li>OpenAI API – AI-powered text processing and game title extraction</li>
      <li>Steam Web API – User game library synchronization</li>
    </ul>
  </li>
  
  <li><strong>Storage & State:</strong> Local Storage (persisting user search state)</li>
  
  <li><strong>Other Tools:</strong> Git, GitHub</li>
</ul>

<h2>About Me</h2>
Thank you for checking out my work — I hope you enjoyed exploring this project!
I’m currently seeking new opportunities in Web Development and would love to connect.<br />

My Links:<br />

<a href="mailto:austintorres578@gmail.com">austintorres578@gmail.com</a><br />
<a href="https://austintorres578.github.io/Web-dev-portfolio/">Portfolio Site</a><br />
<a href="https://github.com/austintorres578">GitHub</a><br />
<a href="https://www.linkedin.com/in/austin-torres-55696420a/">LinkedIn</a><br />
