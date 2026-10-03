Prep Master
Prep Master is a responsive batch-list website with a separate admin page and claim page.
Batch sources
The batch list is loaded from:
https://sahuvijay143.github.io/kgs_batch_list/New_Sunny.json
When a user opens a batch, the app first checks the saved premium key. After successful verification, it redirects to:
https://sahukgs.com/batch/{batchId}
For example, batch ID 1253 opens https://sahukgs.com/batch/1253.
Project structure
Prep-mastervidya-main/
├── package.json
├── README.md
├── server.js
└── public/
    ├── index.html
    ├── admin.html
    ├── claim.html
    └── assets/
        ├── app.js
        ├── style.css
        └── prep-master-logo.png
Run locally
Requires Node.js 18 or newer.
npm install
npm start
Open http://localhost:3000.
Render deployment
Build command: npm install
Start command: npm start
Root directory: leave blank when this repository structure is at the repository root.
Configuration
Set the required environment variables in your hosting dashboard. Do not commit private keys or service-role credentials to GitHub. The batch JSON URL and batch-open URL are configured in server.js and public/assets/app.js, respectively.
Notes
The batch-open destination is constructed from the batch id; only the ID changes.
Premium-key verification happens before redirecting to the external batch page.
The external batch website controls the content shown after redirect.
If the JSON provider changes its response structure or becomes unavailable, batch loading may need an update.
