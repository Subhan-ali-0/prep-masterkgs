const state = {
  batches: [],
  currentBatch: null,
  activeCourseUrl: "",
  hls: null,
  premiumToken: localStorage.getItem("prepMasterPremiumToken") || "",
  premiumType: localStorage.getItem("prepMasterPremiumType") || ""
};

const DEFAULT_24H_URL = "https://vplink.in/lkWPb";
let publicConfig = {
  purchaseTelegram: "Subhanali011",
  telegramChannel: "prepmaster0",
  twentyFourHourUrl: DEFAULT_24H_URL
};

async function loadPublicConfig() {
  try {
    const data = await api("/api/public-config");
    if (data?.config) publicConfig = { ...publicConfig, ...data.config };
  } catch (error) {
    console.warn("Public config unavailable:", error);
  }
}

function hasSavedPremium() {
  return Boolean(state.premiumToken);
}

async function checkSavedPremium() {
  if (!state.premiumToken) return false;
  try {
    const response = await fetch(`/api/check-premium?token=${encodeURIComponent(state.premiumToken)}`);
    if (!response.ok) throw new Error("expired");
    const data = await response.json();
    if (data.valid) return true;
  } catch {}
  localStorage.removeItem("prepMasterPremiumToken");
  localStorage.removeItem("prepMasterPremiumType");
  state.premiumToken = "";
  state.premiumType = "";
  return false;
}

function savePremium(data) {
  state.premiumToken = data.token;
  state.premiumType = data.type || "";
  localStorage.setItem("prepMasterPremiumToken", state.premiumToken);
  localStorage.setItem("prepMasterPremiumType", state.premiumType);
}

async function verifyPremiumKey(key) {
  const clean = String(key || "").trim();
  if (!clean) {
    showToast("Please enter a premium key");
    return false;
  }
  try {
    const response = await fetch("/api/verify-premium-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: clean })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Invalid key");
    }
    savePremium(data);
    showToast(data.type === "lifetime" ? "👑 Lifetime Premium activated" : "✅ 24H Premium activated");
    return true;
  } catch (error) {
    showToast(error.message || "Key verification failed");
    return false;
  }
}

function showPremiumGate() {
  const gate = $("premiumGate");
  if (!gate) return;
  gate.classList.remove("hidden");
  document.body.classList.add("viewer-open");
}

function hidePremiumGate() {
  const gate = $("premiumGate");
  if (!gate) return;
  gate.classList.add("hidden");
  document.body.classList.remove("viewer-open");
}

function openPremiumCourse() {
  const batch = state.currentBatch;
  if (!batch) return;

  const viewer = $("courseViewer");
  const frame = $("courseFrame");
  const loading = $("courseLoading");
  const errorBox = $("courseError");
  const title = $("courseTitle");
  const url = `https://sahukgs.com/batch/${encodeURIComponent(batch.id)}`;

  state.activeCourseUrl = url;
  document.title = `${batch.title || "Batch"} - Prep Master`;
  if (title) title.textContent = batch.title || `Batch ${batch.id}`;
  if (errorBox) errorBox.classList.add("hidden");
  if (loading) loading.classList.remove("hidden");
  hidePremiumGate();

  // Keep the Prep Master header visible and load the selected batch inside it.
  if (viewer) viewer.classList.remove("hidden");
  document.body.classList.add("viewer-open");
  if (frame) frame.src = url;
}


const $ = (id) =>
  document.getElementById(id);


// ==================================================
// HELPERS
// ==================================================

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[ch])
  );
}


function showToast(message) {
  const toast = $("toast");

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}


// ==================================================
// CUSTOM POPUP
// ==================================================

function showActionPopup({
  title = "Prep Master",
  message = "",
  icon = "✓",
  buttons = []
} = {}) {

  const oldPopup =
    document.getElementById("pmActionPopup");

  if (oldPopup) {
    oldPopup.remove();
  }

  const popup =
    document.createElement("div");

  popup.id =
    "pmActionPopup";

  popup.innerHTML = `
    <div class="pm-popup-backdrop">
      <div class="pm-popup-card">

        <div class="pm-popup-icon">
          ${icon}
        </div>

        <h2>
          ${escapeHtml(title)}
        </h2>

        <p>
          ${escapeHtml(message)}
        </p>

        <div class="pm-popup-actions">
          ${
            buttons.map(
              button => `
                <button
                  type="button"
                  class="pm-popup-btn ${escapeHtml(
                    button.className || ""
                  )}"
                  data-popup-action="${escapeHtml(
                    button.id || ""
                  )}"
                >
                  ${escapeHtml(button.text || "OK")}
                </button>
              `
            ).join("")
          }
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(popup);

  const style =
    document.getElementById(
      "pmPopupStyle"
    );

  if (!style) {

    const css =
      document.createElement("style");

    css.id =
      "pmPopupStyle";

    css.textContent = `
      #pmActionPopup {
        position: fixed;
        inset: 0;
        z-index: 999999;
      }

      .pm-popup-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,.72);
        backdrop-filter: blur(7px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 22px;
      }

      .pm-popup-card {
        width: min(420px, 100%);
        background: #050505;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 24px;
        padding: 28px 22px 22px;
        text-align: center;
        box-shadow: 0 25px 80px rgba(0,0,0,.65);
        animation: pmPopupIn .22s ease;
      }

      .pm-popup-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 16px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #111;
        border: 1px solid rgba(255,255,255,.12);
        color: #fff;
        font-size: 30px;
        font-weight: 800;
      }

      .pm-popup-card h2 {
        margin: 0 0 10px;
        color: #fff;
        font-size: 23px;
        font-weight: 800;
      }

      .pm-popup-card p {
        margin: 0;
        color: #aaa;
        line-height: 1.6;
        font-size: 15px;
      }

      .pm-popup-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 22px;
      }

      .pm-popup-btn {
        min-width: 105px;
        border: 0;
        border-radius: 12px;
        padding: 12px 18px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        background: #222;
        color: #fff;
      }

      .pm-popup-btn.primary {
        background: #2878ff;
      }

      .pm-popup-btn.danger {
        background: #242424;
        color: #ff7777;
      }

      @keyframes pmPopupIn {
        from {
          opacity: 0;
          transform: translateY(12px) scale(.97);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;

    document.head.appendChild(css);
  }


  buttons.forEach(button => {

    const element =
      popup.querySelector(
        `[data-popup-action="${CSS.escape(
          button.id || ""
        )}"]`
      );

    if (!element) return;

    element.onclick = () => {

      popup.remove();

      if (typeof button.onClick === "function") {
        button.onClick();
      }
    };
  });


  const backdrop =
    popup.querySelector(
      ".pm-popup-backdrop"
    );

  if (backdrop) {

    backdrop.addEventListener(
      "click",
      event => {

        if (
          event.target === backdrop &&
          buttons.length === 1
        ) {
          popup.remove();
        }

      }
    );
  }
}


// ==================================================
// API
// ==================================================

async function api(url) {

  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      `Request failed (${response.status})`
    );
  }

  return data;
}


// ==================================================
// MY BATCHES
// ==================================================

function getSaved() {

  try {

    return JSON.parse(
      localStorage.getItem(
        "prepMasterMyBatches"
      ) || "[]"
    );

  } catch {

    return [];
  }
}


function saveSaved(items) {

  localStorage.setItem(
    "prepMasterMyBatches",
    JSON.stringify(items)
  );
}


function isMyBatch(id) {

  return getSaved().some(
    batch =>
      String(batch.id) ===
      String(id)
  );
}


// ==================================================
// ENROLL
// ==================================================

function addMyBatch(batch) {

  if (
    !batch ||
    batch.id == null
  ) {

    showToast(
      "Invalid batch"
    );

    return;
  }


  if (isMyBatch(batch.id)) {

    showToast(
      "This batch is already in My Batches"
    );

    return;
  }


  const saved =
    getSaved();

  saved.unshift(batch);

  saveSaved(saved);

  renderBatches();
  renderMyBatches();


  showActionPopup({

    title: "Congratulations 🎉",

    message:
      "You have successfully enrolled in this batch. Your batch has been added to My Batches.",

    icon: "✓",

    buttons: [
      {
        id: "done",
        text: "Done",
        className: "primary"
      }
    ]
  });
}


// ==================================================
// UNENROLL
// ==================================================

function removeMyBatch(id) {

  const saved =
    getSaved();

  const batch =
    saved.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!batch) {
    return;
  }


  showActionPopup({

    title: "Unenroll from batch?",

    message:
      `Are you sure you want to remove "${batch.title || "this batch"}" from My Batches?`,

    icon: "!",

    buttons: [

      {
        id: "cancel",
        text: "Cancel"
      },

      {
        id: "remove",
        text: "Unenroll",
        className: "danger",

        onClick: () => {

          const updated =
            getSaved().filter(
              item =>
                String(item.id) !==
                String(id)
            );

          saveSaved(updated);

          renderBatches();
          renderMyBatches();


          showActionPopup({

            title: "Batch Removed",

            message:
              "The batch has been successfully removed from My Batches.",

            icon: "✓",

            buttons: [
              {
                id: "done",
                text: "Done",
                className: "primary"
              }
            ]
          });

        }
      }

    ]
  });
}


// ==================================================
// BATCH CARD
// ==================================================

function batchCard(
  batch,
  saved = false
) {

  const title =
    escapeHtml(
      batch.title ||
      `Batch ${batch.id}`
    );

  const id =
    escapeHtml(
      batch.id
    );


  const thumb =
    batch.thumbnail
      ? `
        <img
          class="batch-img"
          src="${escapeHtml(batch.thumbnail)}"
          alt=""
          loading="lazy"
          onerror="
            this.style.display='none';
            if(this.nextElementSibling){
              this.nextElementSibling.style.display='flex';
            }
          "
        >

        <div
          class="batch-placeholder"
          style="display:none"
        >
          PREP MASTER
        </div>
      `
      : `
        <div class="batch-placeholder">
          PREP MASTER
        </div>
      `;


  return `
    <article
      class="batch-card"
      data-batch-id="${id}"
    >

      ${thumb}

      <div class="batch-body">

        <h3>
          ${title}
        </h3>

        <p>
          Course ID:
          ${id}
        </p>

        <div class="card-actions">

          <button
            type="button"
            class="primary-mini open-batch"
            data-id="${id}"
          >
            Open Batch
          </button>


          ${
            saved
              ? `
                <button
                  type="button"
                  class="small-btn danger unenroll-btn remove-batch"
                  data-id="${id}"
                >
                  Unenroll
                </button>
              `
              : `
                ${
                  isMyBatch(batch.id)
                    ? `
                      <button
                        type="button"
                        class="small-btn"
                        disabled
                      >
                        ✓ Enrolled
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        class="small-btn add-batch"
                        data-id="${id}"
                      >
                        + My Batches
                      </button>
                    `
                }
              `
          }

        </div>

      </div>

    </article>
  `;
}


// ==================================================
// CREATE HOME BATCH SECTION
// ==================================================
//
// Agar index.html me batchGrid sirf
// Batches page ke andar hai to ye function
// us grid ko Home page par bhi show karega.
//

function setupHomeBatches() {

  const home =
    document.querySelector(
      '.page-view[data-page="home"]'
    );

  const existingHomeGrid =
    $("homeBatchGrid");


  if (!home) {
    return;
  }


  if (existingHomeGrid) {
    return;
  }


  const section =
    document.createElement("section");

  section.id =
    "homeBatchesSection";

  section.className =
    "home-batches-section";


  section.innerHTML = `
    <div class="home-batches-heading">

      <div>
        <span class="home-batches-label">
          PREP MASTER
        </span>

        <h2>
          Explore Batches
        </h2>

        <p>
          Choose your batch and start learning.
        </p>
      </div>

      <button
        type="button"
        id="homeMyBatchesBtn"
        class="small-btn"
      >
        My Batches
      </button>

    </div>

    <div
      id="homeBatchStatus"
      class="batch-status"
    >
      Loading batches…
    </div>

    <div
      id="homeBatchGrid"
      class="batch-grid"
    ></div>
  `;


  /*
    Home ke existing content ke baad
    batches section add kiya ja raha hai.
  */

  home.appendChild(section);


  const myButton =
    $("homeMyBatchesBtn");

  if (myButton) {

    myButton.onclick =
      () => {

        showPage(
          "my-batches"
        );
      };
  }


  const style =
    document.getElementById(
      "pmHomeBatchStyle"
    );


  if (!style) {

    const css =
      document.createElement("style");

    css.id =
      "pmHomeBatchStyle";

    css.textContent = `
      .home-batches-section {
        width: 100%;
        margin-top: 42px;
        padding: 0 0 40px;
      }

      .home-batches-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 20px;
      }

      .home-batches-label {
        display: block;
        color: #3f82ff;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 2px;
        margin-bottom: 7px;
      }

      .home-batches-heading h2 {
        margin: 0;
        color: #fff;
        font-size: 28px;
        font-weight: 800;
      }

      .home-batches-heading p {
        margin: 7px 0 0;
        color: #8e8e8e;
        font-size: 14px;
      }

      .home-batches-section .batch-status {
        margin: 10px 0 16px;
        color: #888;
        font-size: 13px;
      }

      .home-batches-section .batch-grid {
        width: 100%;
      }

      @media (max-width: 600px) {

        .home-batches-section {
          margin-top: 32px;
        }

        .home-batches-heading {
          align-items: flex-start;
          flex-direction: column;
        }

        .home-batches-heading h2 {
          font-size: 24px;
        }

      }
    `;

    document.head.appendChild(css);
  }
}


// ==================================================
// RENDER BATCHES
// ==================================================

function renderBatches() {

  /*
    Main Batches page grid
  */

  const grid =
    $("batchGrid");


  if (grid) {

    grid.innerHTML =
      state.batches
        .map(
          batch =>
            batchCard(
              batch,
              false
            )
        )
        .join("");

    bindBatchButtons(grid);
  }


  /*
    Home page batch grid
  */

  const homeGrid =
    $("homeBatchGrid");


  if (homeGrid) {

    homeGrid.innerHTML =
      state.batches
        .map(
          batch =>
            batchCard(
              batch,
              false
            )
        )
        .join("");

    bindBatchButtons(
      homeGrid
    );
  }


  const homeStatus =
    $("homeBatchStatus");


  if (homeStatus) {

    homeStatus.textContent =
      state.batches.length
        ? `${state.batches.length} batches available`
        : "No batches available";
  }
}


// ==================================================
// RENDER MY BATCHES
// ==================================================

function renderMyBatches() {

  const grid =
    $("myBatchGrid");

  const empty =
    $("myEmpty");


  if (!grid) {
    return;
  }


  const saved =
    getSaved();


  grid.innerHTML =
    saved
      .map(
        batch =>
          batchCard(
            batch,
            true
          )
      )
      .join("");


  if (empty) {

    empty.classList.toggle(
      "hidden",
      saved.length > 0
    );
  }


  bindBatchButtons(
    grid
  );
}


// ==================================================
// BATCH BUTTONS
// ==================================================

function bindBatchButtons(
  container
) {

  if (!container) {
    return;
  }


  // -----------------------------------------------
  // OPEN BATCH
  // -----------------------------------------------

  container
    .querySelectorAll(
      ".open-batch"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            const batch =
              state.batches.find(
                item =>
                  String(item.id) ===
                  String(button.dataset.id)
              ) ||

              getSaved().find(
                item =>
                  String(item.id) ===
                  String(button.dataset.id)
              );


            if (!batch) {

              showToast(
                "Batch not found"
              );

              return;
            }


            openBatch(
              batch
            );
          };
      }
    );


  // -----------------------------------------------
  // ADD / ENROLL
  // -----------------------------------------------

  container
    .querySelectorAll(
      ".add-batch"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            const batch =
              state.batches.find(
                item =>
                  String(item.id) ===
                  String(button.dataset.id)
              );


            if (batch) {

              addMyBatch(
                batch
              );
            }
          };
      }
    );


  // -----------------------------------------------
  // UNENROLL
  // -----------------------------------------------

  container
    .querySelectorAll(
      ".remove-batch"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            removeMyBatch(
              button.dataset.id
            );
          };
      }
    );
}


// ==================================================
// LOAD BATCHES
// ==================================================

async function loadBatches() {

  const status =
    $("batchStatus");


  if (status) {

    status.textContent =
      "Loading batches…";

    status.classList.remove(
      "error"
    );
  }


  try {

    const data =
      await api(
        "/api/batches"
      );


    let list = [];


    if (
      Array.isArray(data)
    ) {

      list = data;

    } else if (
      Array.isArray(data?.new)
    ) {

      list = data.new;

    } else if (
      Array.isArray(data?.batches)
    ) {

      list = data.batches;

    } else if (
      Array.isArray(data?.data)
    ) {

      list = data.data;
    }


    state.batches =
      list
        .map(
          item => ({

            id:
              item.id ??
              item.course_id ??
              item.courseId,

            title:
              item.title ||
              item.name ||
              item.course_name ||
              item.courseName ||
              `Batch ${
                item.id ??
                item.course_id ??
                ""
              }`,

            thumbnail:
              item.thumbnail ||
              item.image ||
              item.image_url ||
              item.thumbnail_url ||
              "",

            courseUrl:
              item.courseUrl ||
              item.course_url ||
              ""

          })
        )
        .filter(
          item =>
            item.id != null
        );


    renderBatches();


    if (status) {

      status.textContent =
        `${state.batches.length} batches loaded`;
    }


  } catch (error) {

    console.error(
      "Batches error:",
      error
    );


    if (status) {

      status.textContent =
        `Could not load batches: ${error.message}`;

      status.classList.add(
        "error"
      );
    }


    const homeStatus =
      $("homeBatchStatus");


    if (homeStatus) {

      homeStatus.textContent =
        "Unable to load batches right now.";
    }
  }
}


// ==================================================
// OPEN BATCH
// ==================================================
//
// Dynamic KGS URL:
// https://sahukgs.com/batch/{batchId}
// Example: https://sahukgs.com/batch/1253
//
// ==================================================

function openBatch(batch) {
  if (!batch || batch.id == null) {
    showToast("Invalid batch ID");
    return;
  }

  state.currentBatch = batch;
  state.activeCourseUrl = `https://sahukgs.com/batch/${encodeURIComponent(batch.id)}`;
  document.title = `${batch.title || "Batch"} - Prep Master`;

  checkSavedPremium().then(valid => {
    if (valid) {
      openPremiumCourse();
    } else {
      showPremiumGate();
    }
  });
}


// ==================================================
// CLOSE COURSE VIEWER
// ==================================================

function closeCourseViewer() {

  const viewer =
    $("courseViewer");

  const frame =
    $("courseFrame");

  const loading =
    $("courseLoading");

  const errorBox =
    $("courseError");


  if (frame) {

    frame.src =
      "about:blank";
  }


  if (viewer) {

    viewer.classList.add(
      "hidden"
    );
  }


  if (loading) {

    loading.classList.remove(
      "hidden"
    );
  }


  if (errorBox) {

    errorBox.classList.add(
      "hidden"
    );
  }


  document.body.classList.remove(
    "viewer-open"
  );


  state.activeCourseUrl =
    "";


  document.title =
    "Prep Master";
}


// ==================================================
// COURSE IFRAME LOAD
// ==================================================

const courseFrame =
  $("courseFrame");


if (courseFrame) {

  courseFrame.addEventListener(
    "load",
    () => {

      const loading =
        $("courseLoading");


      if (loading) {

        loading.classList.add(
          "hidden"
        );
      }

    }
  );


  courseFrame.addEventListener(
    "error",
    () => {

      const loading =
        $("courseLoading");

      const errorBox =
        $("courseError");


      if (loading) {

        loading.classList.add(
          "hidden"
        );
      }


      if (errorBox) {

        errorBox.classList.remove(
          "hidden"
        );
      }

    }
  );
}


// ==================================================
// RETRY COURSE
// ==================================================

const retryCourse =
  $("retryCourse");


if (retryCourse) {

  retryCourse.onclick =
    () => {

      if (
        state.currentBatch
      ) {

        openBatch(
          state.currentBatch
        );
      }

    };
}


// ==================================================
// COURSE BACK
// ==================================================

const courseBackBtn =
  $("courseBackBtn");


if (courseBackBtn) {

  courseBackBtn.onclick =
    () => {

      closeCourseViewer();
    };
}


// ==================================================
// COURSE CLOSE
// ==================================================

const courseCloseBtn =
  $("courseCloseBtn");


if (courseCloseBtn) {

  courseCloseBtn.onclick =
    () => {

      closeCourseViewer();
    };
}


// ==================================================
// PREMIUM ACCESS BUTTONS
// ==================================================

const verify24KeyBtn = $("verify24KeyBtn");
const verifyPremiumKeyBtn = $("verifyPremiumKeyBtn");
const get24KeyBtn = $("get24KeyBtn");
const buyPremiumBtn = $("buyPremiumBtn");
const howGenerateKeyBtn = $("howGenerateKeyBtn");
const howBuyPremiumKeyBtn = $("howBuyPremiumKeyBtn");
const premiumBackBtn = $("premiumBackBtn");
const access24Key = $("access24Key");
const premiumKey = $("premiumKey");

if (verify24KeyBtn) {
  verify24KeyBtn.onclick = async () => {
    const ok = await verifyPremiumKey(access24Key?.value);
    if (ok) openPremiumCourse();
  };
}

if (verifyPremiumKeyBtn) {
  verifyPremiumKeyBtn.onclick = async () => {
    const ok = await verifyPremiumKey(premiumKey?.value);
    if (ok) openPremiumCourse();
  };
}

if (get24KeyBtn) {
  get24KeyBtn.onclick = () => {
    window.open(publicConfig.twentyFourHourUrl || DEFAULT_24H_URL, "_blank", "noopener,noreferrer");
  };
}

if (buyPremiumBtn) {
  buyPremiumBtn.onclick = () => {
    const batchName = state.currentBatch?.title || "KGS batch";
    const message = `Hello, mujhe ${batchName} ki Premium Key leni hai. Please premium key ka price aur payment details bhej dijiye.`;
    const username = String(publicConfig.purchaseTelegram || "Subhanali011").replace(/^@/, "");
    const url = `https://t.me/${username}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
}

if (howGenerateKeyBtn) {
  howGenerateKeyBtn.onclick = () => {
    const url = publicConfig.howToGenerate24hVideoUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else showToast("Admin has not added the 24H key tutorial link yet.");
  };
}

if (howBuyPremiumKeyBtn) {
  howBuyPremiumKeyBtn.onclick = () => {
    const url = publicConfig.howToBuyPremiumVideoUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else showToast("Admin has not added the Premium key tutorial link yet.");
  };
}

if (premiumBackBtn) {
  premiumBackBtn.onclick = () => {
    hidePremiumGate();
    state.currentBatch = null;
    state.activeCourseUrl = "";
    document.title = "Prep Master";
  };
}

// ==================================================
// PAGE VIEWS
// ==================================================

function showPage(page) {

  const allowed = [
    "home",
    "batches",
    "my-batches"
  ];


  const target =
    allowed.includes(page)
      ? page
      : "home";


  document
    .querySelectorAll(
      ".page-view"
    )
    .forEach(
      view => {

        view.classList.toggle(
          "active",
          view.dataset.page ===
          target
        );
      }
    );


  if (
    target ===
    "my-batches"
  ) {

    renderMyBatches();
  }


  /*
    Home par batches hamesha
    freshly render honge.
  */

  if (
    target ===
    "home"
  ) {

    renderBatches();
  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  const menu =
    $("menuPanel");


  if (menu) {

    menu.classList.remove(
      "open"
    );


    $("menuBtn")
      ?.setAttribute(
        "aria-expanded",
        "false"
      );


    menu.setAttribute(
      "aria-hidden",
      "true"
    );
  }


  if (
    window.location.hash !==
    `#${target}`
  ) {

    history.replaceState(
      null,
      "",
      `#${target}`
    );
  }
}


// ==================================================
// PAGE NAVIGATION
// ==================================================

document
  .querySelectorAll(
    "[data-view]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          showPage(
            button.dataset.view
          );
        }
      );
    }
  );


window.addEventListener(
  "hashchange",
  () => {

    const hash =
      window.location.hash
        .replace(
          "#",
          ""
        );


    if (
      [
        "home",
        "batches",
        "my-batches"
      ].includes(hash)
    ) {

      showPage(
        hash
      );
    }
  }
);


// ==================================================
// MENU
// ==================================================

const menuBtn =
  $("menuBtn");

const menuPanel =
  $("menuPanel");


if (
  menuBtn &&
  menuPanel
) {

  menuBtn.onclick =
    event => {

      event.stopPropagation();


      const open =
        menuPanel.classList.toggle(
          "open"
        );


      menuBtn.setAttribute(
        "aria-expanded",
        String(open)
      );


      menuPanel.setAttribute(
        "aria-hidden",
        String(!open)
      );
    };


  document.addEventListener(
    "click",
    event => {

      if (
        !menuPanel.contains(
          event.target
        ) &&
        !menuBtn.contains(
          event.target
        )
      ) {

        menuPanel.classList.remove(
          "open"
        );


        menuBtn.setAttribute(
          "aria-expanded",
          "false"
        );


        menuPanel.setAttribute(
          "aria-hidden",
          "true"
        );
      }

    }
  );
}


// ==================================================
// CLEAR MY BATCHES
// ==================================================

const clearSaved =
  $("clearSaved");


if (clearSaved) {

  clearSaved.onclick =
    () => {

      const saved =
        getSaved();


      if (
        saved.length === 0
      ) {

        showToast(
          "My Batches is already empty"
        );

        return;
      }


      showActionPopup({

        title: "Clear My Batches?",

        message:
          "This will remove all enrolled batches from My Batches.",

        icon: "!",

        buttons: [

          {
            id: "cancel",
            text: "Cancel"
          },

          {
            id: "clear",
            text: "Clear All",
            className: "danger",

            onClick: () => {

              saveSaved([]);

              renderBatches();
              renderMyBatches();


              showActionPopup({

                title: "My Batches Cleared",

                message:
                  "All saved batches have been removed.",

                icon: "✓",

                buttons: [
                  {
                    id: "done",
                    text: "Done",
                    className: "primary"
                  }
                ]
              });

            }
          }

        ]
      });

    };
}


// ==================================================
// REFRESH BATCHES
// ==================================================

const refreshBatches =
  $("refreshBatches");


if (refreshBatches) {

  refreshBatches.onclick =
    loadBatches;
}


// ==================================================
// VIDEO / MATERIAL SUPPORT
// ==================================================

function openModal(id) {

  const modal =
    $(id);


  if (!modal) {
    return;
  }


  modal.classList.remove(
    "hidden"
  );


  document.body.style.overflow =
    "hidden";
}


function closeModal(id) {

  const modal =
    $(id);


  if (!modal) {
    return;
  }


  modal.classList.add(
    "hidden"
  );


  const anotherOpen =
    [
      ...document.querySelectorAll(
        ".modal"
      )
    ].some(
      item =>
        !item.classList.contains(
          "hidden"
        )
    );


  if (!anotherOpen) {

    document.body.style.overflow =
      "";
  }
}


// ==================================================
// FIND VIDEO URL
// ==================================================

function findVideoUrl(data) {

  const directFields = [
    "decoded_video_link",
    "video_url",
    "hls_url",
    "stream_url",
    "playback_url",
    "play_url",
    "url"
  ];


  for (
    const key of directFields
  ) {

    if (
      typeof data?.[key] ===
      "string" &&
      data[key].trim()
    ) {

      return data[key].trim();
    }
  }


  const nestedObjects = [
    data?.data,
    data?.result,
    data?.video,
    data?.class,
    data?.response
  ];


  for (
    const object of nestedObjects
  ) {

    if (
      !object ||
      typeof object !==
      "object"
    ) {

      continue;
    }


    for (
      const key of directFields
    ) {

      if (
        typeof object[key] ===
        "string" &&
        object[key].trim()
      ) {

        return object[key].trim();
      }
    }
  }


  return null;
}


// ==================================================
// OPEN VIDEO
// ==================================================

async function openVideo(
  videoId
) {

  const title =
    $("videoTitle");

  const info =
    $("videoInfo");

  const video =
    $("videoPlayer");


  if (!video) {

    showToast(
      "Video player not found"
    );

    return;
  }


  if (title) {

    title.textContent =
      "Loading video…";
  }


  if (info) {

    info.textContent =
      "Connecting to video server…";
  }


  openModal(
    "videoModal"
  );


  try {

    if (state.hls) {

      state.hls.destroy();

      state.hls =
        null;
    }


    video.pause();

    video.removeAttribute(
      "src"
    );

    video.load();


    if (
      !state.currentBatch
    ) {

      throw new Error(
        "No current batch selected."
      );
    }


    const apiUrl =
      `/api/video?course_id=${
        encodeURIComponent(
          state.currentBatch.id
        )
      }&video_id=${
        encodeURIComponent(
          videoId
        )
      }`;


    const data =
      await api(
        apiUrl
      );


    const stream =
      findVideoUrl(
        data
      );


    if (title) {

      title.textContent =
        data?.title ||
        data?.name ||
        `Video ${videoId}`;
    }


    if (!stream) {

      throw new Error(
        "Video API did not return a playable video URL."
      );
    }


    if (
      window.Hls &&
      Hls.isSupported()
    ) {

      if (info) {

        info.textContent =
          "Preparing video…";
      }


      state.hls =
        new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90
        });


      state.hls.on(
        Hls.Events.MANIFEST_PARSED,
        () => {

          if (info) {

            info.textContent =
              "Video ready";
          }


          video
            .play()
            .catch(
              () => {

                if (info) {

                  info.textContent =
                    "Video ready. Press play to start.";
                }
              }
            );
        }
      );


      state.hls.on(
        Hls.Events.ERROR,
        (
          event,
          detail
        ) => {

          console.error(
            "HLS ERROR:",
            detail
          );


          if (!detail.fatal) {
            return;
          }


          if (
            detail.type ===
            Hls.ErrorTypes.NETWORK_ERROR
          ) {

            if (info) {

              info.textContent =
                "Video stream network error.";
            }

            return;
          }


          if (
            detail.type ===
            Hls.ErrorTypes.MEDIA_ERROR
          ) {

            if (info) {

              info.textContent =
                "Video format/playback error.";
            }


            try {

              state.hls
                .recoverMediaError();

            } catch {}

            return;
          }


          if (info) {

            info.textContent =
              "The video could not be played.";
          }
        }
      );


      state.hls.loadSource(
        stream
      );


      state.hls.attachMedia(
        video
      );


      return;
    }


    if (
      video.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {

      video.src =
        stream;


      video.addEventListener(
        "loadedmetadata",
        () => {

          video
            .play()
            .catch(
              () => {

                if (info) {

                  info.textContent =
                    "Video ready. Press play to start.";
                }
              }
            );
        },
        {
          once: true
        }
      );


      return;
    }


    throw new Error(
      "This browser does not support HLS playback."
    );


  } catch (error) {

    console.error(
      "Video playback error:",
      error
    );


    if (title) {

      title.textContent =
        "Video unavailable";
    }


    if (info) {

      info.textContent =
        error.message ||
        "Unable to play this video.";
    }
  }
}


// ==================================================
// OPEN MATERIAL
// ==================================================

function openMaterial(
  title,
  url
) {

  const materialTitle =
    $("materialTitle");

  const materialOpen =
    $("materialOpen");

  const materialFrame =
    $("materialFrame");


  if (materialTitle) {

    materialTitle.textContent =
      title ||
      "Study material";
  }


  if (materialOpen) {

    materialOpen.href =
      url;
  }


  if (materialFrame) {

    materialFrame.src =
      url;
  }


  openModal(
    "materialModal"
  );
}


// ==================================================
// CLOSE VIDEO
// ==================================================

function closeVideoPlayer() {

  const video =
    $("videoPlayer");


  if (!video) {
    return;
  }


  video.pause();

  video.removeAttribute(
    "src"
  );

  video.load();


  if (state.hls) {

    state.hls.destroy();

    state.hls =
      null;
  }
}


// ==================================================
// NORMAL MODAL CLOSE
// ==================================================

document
  .querySelectorAll(
    "[data-close]"
  )
  .forEach(
    button => {

      button.onclick =
        () => {

          const id =
            button.dataset.close;


          if (
            id ===
            "videoModal"
          ) {

            closeVideoPlayer();
          }


          if (
            id ===
            "materialModal"
          ) {

            const frame =
              $("materialFrame");


            if (frame) {

              frame.src =
                "about:blank";
            }
          }


          closeModal(
            id
          );
        };
    }
  );


// ==================================================
// MODAL BACKDROP
// ==================================================

document
  .querySelectorAll(
    ".modal"
  )
  .forEach(
    modal => {

      modal.addEventListener(
        "click",
        event => {

          if (
            event.target ===
            modal
          ) {

            if (
              modal.id ===
              "videoModal"
            ) {

              closeVideoPlayer();
            }


            if (
              modal.id ===
              "materialModal"
            ) {

              const frame =
                $("materialFrame");


              if (frame) {

                frame.src =
                  "about:blank";
              }
            }


            closeModal(
              modal.id
            );
          }
        }
      );
    }
  );


// ==================================================
// BASIC DEVTOOLS DETERRENTS
// ==================================================
//
// Ye complete security nahi hai.
// Browser-side JS se DevTools ko 100%
// permanently block nahi kiya ja sakta.
//

document.addEventListener(
  "contextmenu",
  event => {

    event.preventDefault();
  }
);


document.addEventListener(
  "keydown",
  event => {

    const key =
      String(
        event.key || ""
      ).toLowerCase();


    const blocked =
      key === "f12" ||

      (
        event.ctrlKey &&
        event.shiftKey &&
        [
          "i",
          "j",
          "c"
        ].includes(key)
      ) ||

      (
        event.ctrlKey &&
        key === "u"
      );


    if (blocked) {

      event.preventDefault();

      event.stopPropagation();

      showToast(
        "This action is disabled on Prep Master"
      );
    }
  }
);


// ==================================================
// INITIAL LOAD
// ==================================================

/*
  Sabse pehle Home ke andar
  Batches section create karo.
*/

setupHomeBatches();


/*
  My Batches render karo.
*/

renderMyBatches();


/*
  Hash ke according page.
*/

const hash =
  window.location.hash
    .replace(
      "#",
      ""
    );


const initialPage =
  [
    "home",
    "batches",
    "my-batches"
  ].includes(hash)
    ? hash
    : "home";


showPage(
  initialPage
);


/*
  Public settings + batches load karo.
*/

loadPublicConfig();
loadBatches();
