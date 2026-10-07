const SUPABASE_URL =
  "https://zpuzhackxbaglwsozxpq.supabase.co";

const SUPABASE_KEY =
  "YOUR_SUPABASE_PUBLISHABLE_KEY";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


let user = null;
let currentChat = null;
let currentNote = null;

let timerSeconds = 25 * 60;
let timerInterval = null;

let tapInterval = null;
let tapScore = 0;
let tapTime = 20;

let quizIndex = 0;
let quizScore = 0;

let audioContext = null;


/* =========================
   AUTH
========================= */

async function initialize() {

  const {
    data: {
      session
    }
  } = await supabaseClient.auth.getSession();


  if (session) {

    user = session.user;

    showApp();

    return;

  }


  document
    .getElementById("guestBtn")
    .onclick = anonymousLogin;


  document
    .getElementById("loginBtn")
    .onclick = login;


  document
    .getElementById("signupBtn")
    .onclick = signup;

}


async function anonymousLogin() {

  setAuthMessage("Signing in...");

  const {
    data,
    error
  } = await supabaseClient.auth.signInAnonymously();


  if (error) {

    setAuthMessage(error.message);

    return;
  }


  user = data.user;

  showApp();

}


async function login() {

  const email =
    document.getElementById("authEmail").value.trim();

  const password =
    document.getElementById("authPassword").value;


  if (!email || !password) {

    setAuthMessage("Enter your email and password.");

    return;
  }


  const {
    data,
    error
  } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });


  if (error) {

    setAuthMessage(error.message);

    return;
  }


  user = data.user;

  showApp();

}


async function signup() {

  const email =
    document.getElementById("authEmail").value.trim();

  const password =
    document.getElementById("authPassword").value;


  if (!email || !password) {

    setAuthMessage("Enter an email and password.");

    return;
  }


  const {
    error
  } = await supabaseClient.auth.signUp({
    email,
    password
  });


  if (error) {

    setAuthMessage(error.message);

    return;
  }


  setAuthMessage(
    "Account created. Check your email if confirmation is enabled."
  );

}


function setAuthMessage(message) {

  document.getElementById(
    "authMessage"
  ).textContent = message;

}


async function showApp() {

  document
    .getElementById("authView")
    .classList.add("hidden");

  document
    .getElementById("app")
    .classList.remove("hidden");


  document
    .getElementById("connectionStatus")
    .textContent = "Online";


  await loadChats();
  await loadStudy();
  await loadNotes();
  await loadGallery();
  await loadMovies();
  await loadProgress();
  await loadSettings();

  buildSpace();

  buildQuiz();

}


/* =========================
   NAVIGATION
========================= */

const pageNames = {
  chat: ["💬 Neon Chat", "Your conversations"],
  study: ["📚 Study Dashboard", "Subjects, tasks and focus"],
  gallery: ["🎨 Interactive Gallery", "Explore artwork"],
  arcade: ["🎮 Neon Arcade", "Play games"],
  movies: ["🎬 Movie Discovery", "Browse movies"],
  soundboard: ["🎧 Soundboard", "Browser-generated sounds"],
  space: ["🌌 Space Explorer", "Explore the Solar System"],
  quiz: ["🧩 Neon Quiz", "Test your knowledge"],
  notes: ["📝 Notes", "Your saved notes"],
  progress: ["📊 Progress", "Your Neon Hub activity"],
  settings: ["⚙️ Settings", "Customize your hub"]
};


document
  .querySelectorAll("nav button")
  .forEach(button => {

    button.addEventListener("click", () => {

      const page = button.dataset.page;

      document
        .querySelectorAll(".page")
        .forEach(p =>
          p.classList.remove("active")
        );


      document
        .getElementById("page-" + page)
        .classList.add("active");


      document.getElementById(
        "pageTitle"
      ).textContent = pageNames[page][0];


      document.getElementById(
        "pageSubtitle"
      ).textContent = pageNames[page][1];

    });

  });


/* =========================
   CHAT
========================= */

async function loadChats() {

  const {
    data,
    error
  } = await supabaseClient
    .from("Neon Chats")
    .select("*")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("created_at", {
      ascending: false
    });


  if (error) {

    console.error(error);

    return;
  }


  const list =
    document.getElementById("chatList");

  list.innerHTML = "";


  data.forEach(chat => {

    const row =
      document.createElement("div");

    row.className = "chat-item";


    const open =
      document.createElement("button");

    open.className = "chat-open";

    open.textContent =
      "💬 " + (chat.title || "New Chat");


    open.onclick = () =>
      openChat(chat.id);


    const remove =
      document.createElement("button");

    remove.className = "chat-delete";

    remove.textContent = "×";

    remove.onclick = () =>
      deleteChat(chat.id);


    row.append(open, remove);

    list.appendChild(row);

  });


  if (!currentChat && data.length) {

    await openChat(data[0].id);

  }


  if (!data.length) {

    await createChat();

  }

}


async function createChat() {

  const {
    data,
    error
  } = await supabaseClient
    .from("Neon Chats")
    .insert({
      user_id: user.id,
      title: "New Chat"
    })
    .select()
    .single();


  if (error) {

    console.error(error);

    return;
  }


  currentChat = data.id;

  await loadChats();
  await loadMessages();

}


async function openChat(id) {

  currentChat = id;

  await loadMessages();

}


async function loadMessages() {

  if (!currentChat) return;


  const {
    data,
    error
  } = await supabaseClient
    .from("Neon Messages")
    .select("*")
    .eq("chat_id", currentChat)
    .order("created_at");


  if (error) {

    console.error(error);

    return;
  }


  const box =
    document.getElementById("messages");

  box.innerHTML = "";


  if (!data.length) {

    box.innerHTML =
      `<div class="message">
        Start your conversation ✨
      </div>`;

    return;
  }


  data.forEach(message => {

    const div =
      document.createElement("div");

    div.className =
      "message " +
      (message.role === "user"
        ? "user"
        : "");


    const role =
      document.createElement("div");

    role.className = "message-role";

    role.textContent = message.role;


    const content =
      document.createElement("div");

    content.textContent =
      message.content;


    div.append(role, content);

    box.appendChild(div);

  });


  box.scrollTop =
    box.scrollHeight;

}


async function sendMessage() {

  const input =
    document.getElementById(
      "messageInput"
    );


  const content =
    input.value.trim();


  if (!content || !currentChat) return;


  const {
    error
  } = await supabaseClient
    .from("Neon Messages")
    .insert({
      chat_id: currentChat,
      role: "user",
      content
    });


  if (error) {

    console.error(error);

    return;
  }


  input.value = "";


  await supabaseClient
    .from("Neon Chats")
    .update({
      title:
        content.length > 30
          ? content.slice(0, 30) + "..."
          : content
    })
    .eq("id", currentChat)
    .eq("user_id", user.id);


  await loadMessages();
  await loadChats();

}


async function deleteChat(id) {

  await supabaseClient
    .from("Neon Messages")
    .delete()
    .eq("chat_id", id);


  await supabaseClient
    .from("Neon Chats")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);


  currentChat = null;

  await loadChats();

}


document
  .getElementById("newChatBtn")
  .onclick = createChat;


document
  .getElementById("sendMessageBtn")
  .onclick = sendMessage;


document
  .getElementById("messageInput")
  .addEventListener("keydown", e => {

    if (e.key === "Enter") {
      sendMessage();
    }

  });


/* =========================
   STUDY
========================= */

async function loadStudy() {

  const {
    data: subjects
  } = await supabaseClient
    .from("Neon Subjects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");


  const {
    data: tasks
  } = await supabaseClient
    .from("Neon Tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false
    });


  renderSubjects(subjects || []);
  renderTasks(tasks || []);

}


function renderSubjects(subjects) {

  const box =
    document.getElementById("subjectList");

  box.innerHTML = "";


  subjects.forEach(subject => {

    const div =
      document.createElement("div");

    div.className = "subject-card";

    div.innerHTML =
      `<span>
        ${escapeHTML(subject.icon || "📚")}
        ${escapeHTML(subject.name)}
      </span>`;

    box.appendChild(div);

  });

}


function renderTasks(tasks) {

  const box =
    document.getElementById("taskList");

  box.innerHTML = "";


  tasks.forEach(task => {

    const div =
      document.createElement("div");

    div.className =
      "task-card " +
      (task.completed ? "done" : "");


    const title =
      document.createElement("span");

    title.textContent =
      task.title;


    const check =
      document.createElement("button");

    check.textContent =
      task.completed ? "✓" : "○";


    check.onclick = async () => {

      await supabaseClient
        .from("Neon Tasks")
        .update({
          completed: !task.completed
        })
        .eq("id", task.id)
        .eq("user_id", user.id);


      await addXP(10);

      await loadStudy();
      await loadProgress();

    };


    div.append(title, check);

    box.appendChild(div);

  });

}


document
  .getElementById("addSubjectBtn")
  .onclick = async () => {

    const name =
      document.getElementById(
        "subjectName"
      ).value.trim();


    const icon =
      document.getElementById(
        "subjectIcon"
      ).value || "📚";


    if (!name) return;


    await supabaseClient
      .from("Neon Subjects")
      .insert({
        user_id: user.id,
        name,
        icon
      });


    document.getElementById(
      "subjectName"
    ).value = "";


    await loadStudy();

  };


document
  .getElementById("addTaskBtn")
  .onclick = async () => {

    const title =
      document.getElementById(
        "taskName"
      ).value.trim();


    if (!title) return;


    await supabaseClient
      .from("Neon Tasks")
      .insert({
        user_id: user.id,
        title
      });


    document.getElementById(
      "taskName"
    ).value = "";


    await loadStudy();

  };


/* =========================
   FOCUS TIMER
========================= */

function updateTimer() {

  const minutes =
    Math.floor(timerSeconds / 60)
      .toString()
      .padStart(2, "0");

  const seconds =
    (timerSeconds % 60)
      .toString()
      .padStart(2, "0");


  document.getElementById(
    "timerDisplay"
  ).textContent =
    `${minutes}:${seconds}`;

}


document
  .getElementById("timerStart")
  .onclick = () => {

    if (timerInterval) return;


    timerInterval =
      setInterval(async () => {

        timerSeconds--;

        updateTimer();


        if (timerSeconds <= 0) {

          clearInterval(timerInterval);

          timerInterval = null;

          await supabaseClient
            .from("Neon Focus Sessions")
            .insert({
              user_id: user.id,
              minutes: 25
            });


          await addXP(25);

          timerSeconds = 25 * 60;

          updateTimer();

          await loadProgress();

        }

      }, 1000);

  };


document
  .getElementById("timerPause")
  .onclick = () => {

    clearInterval(timerInterval);

    timerInterval = null;

  };


document
  .getElementById("timerReset")
  .onclick = () => {

    clearInterval(timerInterval);

    timerInterval = null;

    timerSeconds = 25 * 60;

    updateTimer();

  };


document
  .querySelectorAll(".timer-presets button")
  .forEach(button => {

    button.onclick = () => {

      clearInterval(timerInterval);

      timerInterval = null;

      timerSeconds =
        Number(button.dataset.minutes) * 60;

      updateTimer();

    };

  });


/* =========================
   GALLERY
========================= */

const artworks = [
  ["Neon Dream", "🌃", "Cyberpunk skyline"],
  ["Crystal Void", "💎", "Digital crystal dimension"],
  ["Cosmic Bloom", "🌸", "Flowers among the stars"],
  ["Electric Ocean", "🌊", "A glowing digital sea"],
  ["Synth City", "🏙️", "Future metropolis"],
  ["Pixel Galaxy", "🌌", "A tiny digital universe"],
  ["Neon Forest", "🌲", "Bioluminescent wilderness"],
  ["Dream Machine", "🤖", "A machine built from dreams"]
];


async function loadGallery() {

  const {
    data: favorites
  } = await supabaseClient
    .from("Neon Gallery Favorites")
    .select("artwork_id")
    .eq("user_id", user.id);


  const favoriteIds =
    new Set(
      (favorites || [])
        .map(x => x.artwork_id)
    );


  const grid =
    document.getElementById("galleryGrid");

  grid.innerHTML = "";


  artworks.forEach((art, index) => {

    const card =
      document.createElement("div");

    card.className = "art-card";


    const fav =
      document.createElement("button");

    fav.className = "favorite";

    fav.textContent =
      favoriteIds.has(String(index))
        ? "❤️"
        : "♡";


    fav.onclick = async () => {

      if (favoriteIds.has(String(index))) {

        await supabaseClient
          .from("Neon Gallery Favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("artwork_id", String(index));

      } else {

        await supabaseClient
          .from("Neon Gallery Favorites")
          .insert({
            user_id: user.id,
            artwork_id: String(index)
          });

      }


      await loadGallery();

    };


    const icon =
      document.createElement("div");

    icon.style.fontSize = "70px";

    icon.textContent = art[1];


    card.appendChild(fav);
    card.appendChild(icon);


    const h =
      document.createElement("h3");

    h.textContent = art[0];


    const p =
      document.createElement("p");

    p.textContent = art[2];


    card.append(h, p);

    grid.appendChild(card);

  });

}


/* =========================
   MOVIES
========================= */

const movies = [
  ["The Matrix", "1999", "Sci-Fi"],
  ["Inception", "2010", "Sci-Fi"],
  ["Interstellar", "2014", "Space"],
  ["Spirited Away", "2001", "Animation"],
  ["Blade Runner 2049", "2017", "Sci-Fi"],
  ["The Batman", "2022", "Action"],
  ["Arrival", "2016", "Sci-Fi"],
  ["Spider-Man: Into the Spider-Verse", "2018", "Animation"],
  ["Everything Everywhere All at Once", "2022", "Adventure"],
  ["Tron: Legacy", "2010", "Sci-Fi"],
  ["Dune", "2021", "Adventure"],
  ["The Martian", "2015", "Space"]
];


async function loadMovies() {

  renderMovies(movies);

}


function renderMovies(list) {

  const grid =
    document.getElementById("movieGrid");

  grid.innerHTML = "";


  list.forEach((movie, index) => {

    const card =
      document.createElement("div");

    card.className = "movie-card";


    const icon =
      document.createElement("div");

    icon.style.fontSize = "45px";

    icon.textContent = "🎬";


    const title =
      document.createElement("h3");

    title.textContent = movie[0];


    const info =
      document.createElement("p");

    info.textContent =
      `${movie[1]} • ${movie[2]}`;


    const fav =
      document.createElement("button");

    fav.textContent = "♡ Favorite";


    fav.onclick = async () => {

      await supabaseClient
        .from("Neon Movie Favorites")
        .insert({
          user_id: user.id,
          movie_id: String(index)
        });

      fav.textContent = "♥ Saved";

    };


    card.append(
      icon,
      title,
      info,
      fav
    );


    grid.appendChild(card);

  });

}


document
  .getElementById("movieSearch")
  .addEventListener("input", e => {

    const query =
      e.target.value.toLowerCase();


    renderMovies(
      movies.filter(movie =>
        movie.join(" ")
          .toLowerCase()
          .includes(query)
      )
    );

  });


/* =========================
   SOUNDBOARD
========================= */

function sound(type) {

  audioContext ||=
    new (
      window.AudioContext ||
      window.webkitAudioContext
    )();


  const osc =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();


  osc.connect(gain);

  gain.connect(audioContext.destination);


  const now =
    audioContext.currentTime;


  const settings = {
    click: [700, .08],
    laser: [1200, .25],
    power: [450, .4],
    coin: [900, .2],
    success: [600, .5],
    error: [180, .3]
  };


  const [
    frequency,
    duration
  ] = settings[type];


  osc.frequency.setValueAtTime(
    frequency,
    now
  );


  if (type === "laser") {

    osc.frequency.exponentialRampToValueAtTime(
      120,
      now + duration
    );

  }


  if (type === "power") {

    osc.frequency.exponentialRampToValueAtTime(
      1000,
      now + duration
    );

  }


  gain.gain.setValueAtTime(
    .001,
    now
  );


  gain.gain.exponentialRampToValueAtTime(
    .2,
    now + .01
  );


  gain.gain.exponentialRampToValueAtTime(
    .001,
    now + duration
  );


  osc.start(now);

  osc.stop(
    now + duration
  );

}


document
  .querySelectorAll(".sound-button")
  .forEach(button => {

    button.onclick = () =>
      sound(button.dataset.sound);

  });


/* =========================
   SPACE
========================= */

const planets = {
  sun: ["☀️ Sun", "The star at the center of our Solar System."],
  earth: ["🌍 Earth", "Our home planet. The only known world with life."],
  mars: ["🔴 Mars", "A cold, rocky world known as the Red Planet."],
  jupiter: ["🟠 Jupiter", "The largest planet in the Solar System."],
  saturn: ["🪐 Saturn", "A gas giant famous for its spectacular rings."]
};


function buildSpace() {

  const system =
    document.getElementById("solarSystem");

  system.innerHTML = "";


  Object.keys(planets).forEach(name => {

    const button =
      document.createElement("button");

    button.className =
      "planet " + name;


    button.onclick = () => {

      const info =
        planets[name];


      document.getElementById(
        "planetInfo"
      ).innerHTML =
        `<h3>${info[0]}</h3>
         <p>${info[1]}</p>`;

    };


    system.appendChild(button);

  });

}


/* =========================
   QUIZ
========================= */

const quiz = [
  {
    question:"Which planet is known as the Red Planet?",
    answers:["Mars","Venus","Jupiter","Mercury"],
    correct:0
  },
  {
    question:"What is 12 × 8?",
    answers:["86","96","108","88"],
    correct:1
  },
  {
    question:"Which language runs in the browser?",
    answers:["Python","C++","JavaScript","SQL"],
    correct:2
  },
  {
    question:"Which ocean is the largest?",
    answers:["Atlantic","Indian","Arctic","Pacific"],
    correct:3
  },
  {
    question:"How many sides does a hexagon have?",
    answers:["5","6","7","8"],
    correct:1
  }
];


function buildQuiz() {

  quizIndex = 0;

  quizScore = 0;

  showQuizQuestion();

}


function showQuizQuestion() {

  const question =
    quiz[quizIndex];


  document.getElementById(
    "quizProgress"
  ).textContent =
    `Question ${quizIndex + 1} / ${quiz.length}`;


  document.getElementById(
    "quizQuestion"
  ).textContent =
    question.question;


  const answers =
    document.getElementById(
      "quizAnswers"
    );


  answers.innerHTML = "";


  question.answers.forEach(
    (answer, index) => {

      const button =
        document.createElement("button");

      button.className =
        "quiz-answer";

      button.textContent =
        answer;


      button.onclick = () => {

        const buttons =
          answers.querySelectorAll("button");


        buttons.forEach(b =>
          b.disabled = true
        );


        if (index === question.correct) {

          button.classList.add("correct");

          quizScore++;

          addXP(10);

        } else {

          button.classList.add("wrong");

          buttons[
            question.correct
          ].classList.add("correct");

        }

      };


      answers.appendChild(button);

    }
  );

}


document
  .getElementById("nextQuizBtn")
  .onclick = async () => {

    quizIndex++;


    if (quizIndex >= quiz.length) {

      await supabaseClient
        .from("Neon Quiz Results")
        .insert({
          user_id: user.id,
          category: "General",
          score: quizScore,
          total: quiz.length
        });


      alert(
        `Quiz complete! Score: ${quizScore}/${quiz.length}`
      );


      quizIndex = 0;

      quizScore = 0;

    }


    showQuizQuestion();

    await loadProgress();

  };


/* =========================
   NOTES
========================= */

async function loadNotes() {

  const {
    data
  } = await supabaseClient
    .from("Neon Notes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", {
      ascending:false
    });


  const list =
    document.getElementById("notesList");

  list.innerHTML = "";


  (data || []).forEach(note => {

    const div =
      document.createElement("div");

    div.className =
      "note-card " +
      (currentNote === note.id
        ? "selected"
        : "");


    div.textContent =
      note.title || "Untitled note";


    div.onclick = () =>
      editNote(note);


    list.appendChild(div);

  });

}


function editNote(note) {

  currentNote = note.id;

  document.getElementById(
    "noteTitle"
  ).value =
    note.title || "";


  document.getElementById(
    "noteContent"
  ).value =
    note.content || "";


  loadNotes();

}


document
  .getElementById("newNoteBtn")
  .onclick = () => {

    currentNote = null;

    document.getElementById(
      "noteTitle"
    ).value = "";

    document.getElementById(
      "noteContent"
    ).value = "";

  };


document
  .getElementById("saveNoteBtn")
  .onclick = async () => {

    const title =
      document.getElementById(
        "noteTitle"
      ).value.trim() ||
      "Untitled note";


    const content =
      document.getElementById(
        "noteContent"
      ).value;


    if (currentNote) {

      await supabaseClient
        .from("Neon Notes")
        .update({
          title,
          content,
          updated_at:new Date().toISOString()
        })
        .eq("id", currentNote)
        .eq("user_id", user.id);

    } else {

      const {
        data
      } = await supabaseClient
        .from("Neon Notes")
        .insert({
          user_id:user.id,
          title,
          content
        })
        .select()
        .single();


      currentNote =
        data?.id || null;

    }


    await addXP(5);

    await loadNotes();
    await loadProgress();

  };


document
  .getElementById("deleteNoteBtn")
  .onclick = async () => {

    if (!currentNote) return;


    await supabaseClient
      .from("Neon Notes")
      .delete()
      .eq("id", currentNote)
      .eq("user_id", user.id);


    currentNote = null;


    document.getElementById(
      "noteTitle"
    ).value = "";


    document.getElementById(
      "noteContent"
    ).value = "";


    await loadNotes();

  };


/* =========================
   PROGRESS
========================= */

async function loadProgress() {

  const {
    data
  } = await supabaseClient
    .from("Neon Progress")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();


  const progress =
    data || {
      xp:0,
      streak:0,
      tasks_completed:0,
      focus_minutes:0
    };


  document.getElementById(
    "xpValue"
  ).textContent =
    progress.xp || 0;


  document.getElementById(
    "streakValue"
  ).textContent =
    progress.streak || 0;


  document.getElementById(
    "tasksValue"
  ).textContent =
    progress.tasks_completed || 0;


  document.getElementById(
    "focusValue"
  ).textContent =
    `${progress.focus_minutes || 0}m`;


  document.getElementById(
    "progressActivity"
  ).innerHTML =
    `<p>⭐ ${progress.xp || 0} XP earned</p>
     <p>🔥 ${progress.streak || 0} day streak</p>
     <p>✅ ${progress.tasks_completed || 0} tasks completed</p>
     <p>⏱ ${progress.focus_minutes || 0} focus minutes</p>`;

}


async function addXP(amount) {

  const {
    data
  } = await supabaseClient
    .from("Neon Progress")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();


  if (data) {

    await supabaseClient
      .from("Neon Progress")
      .update({
        xp:(data.xp || 0) + amount
      })
      .eq("id", data.id)
      .eq("user_id", user.id);


  } else {

    await supabaseClient
      .from("Neon Progress")
      .insert({
        user_id:user.id,
        xp:amount,
        streak:0,
        tasks_completed:0,
        focus_minutes:0
      });

  }

}


/* =========================
   SETTINGS
========================= */

async function loadSettings() {

  const {
    data
  } = await supabaseClient
    .from("Neon Hub")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();


  if (!data) return;


  document.getElementById(
    "usernameInput"
  ).value =
    data.username || "";


  document.getElementById(
    "avatarInput"
  ).value =
    data.avatar_url || "";


  document.getElementById(
    "themeSelect"
  ).value =
    data.theme || "purple";


  applyTheme(
    data.theme || "purple"
  );

}


document
  .getElementById("saveSettingsBtn")
  .onclick = async () => {

    const username =
      document.getElementById(
        "usernameInput"
      ).value.trim();


    const avatar_url =
      document.getElementById(
        "avatarInput"
      ).value.trim();


    const theme =
      document.getElementById(
        "themeSelect"
      ).value;


    const {
      data:existing
    } = await supabaseClient
      .from("Neon Hub")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();


    const values = {
      user_id:user.id,
      username,
      avatar_url,
      theme
    };


    if (existing) {

      await supabaseClient
        .from("Neon Hub")
        .update(values)
        .eq("id", existing.id)
        .eq("user_id", user.id);

    } else {

      await supabaseClient
        .from("Neon Hub")
        .insert(values);

    }


    applyTheme(theme);

  };


function applyTheme(theme) {

  document.body.classList.remove(
    "theme-blue",
    "theme-pink",
    "theme-green"
  );


  if (theme !== "purple") {

    document.body.classList.add(
      "theme-" + theme
    );

  }

}


document
  .getElementById("themeSelect")
  .addEventListener("change", e =>
    applyTheme(e.target.value)
  );


document
  .getElementById("logoutBtn")
  .onclick = async () => {

    await supabaseClient.auth.signOut();

    location.reload();

  };


/* =========================
   ARCADE: TAP
========================= */

document
  .querySelectorAll(".arcade-tabs button")
  .forEach(button => {

    button.onclick = () => {

      document
        .getElementById("tapGame")
        .classList.toggle(
          "hidden",
          button.dataset.game !== "tap"
        );


      document
        .getElementById("memoryGame")
        .classList.toggle(
          "hidden",
          button.dataset.game !== "memory"
        );

    };

  });


document
  .getElementById("startTapBtn")
  .onclick = startTap;


function startTap() {

  clearInterval(tapInterval);

  tapScore = 0;
  tapTime = 20;

  document.getElementById(
    "tapScore"
  ).textContent = 0;


  document.getElementById(
    "tapTime"
  ).textContent = 20;


  const area =
    document.getElementById("tapArea");


  area.innerHTML = "";


  tapInterval =
    setInterval(() => {

      tapTime--;


      document.getElementById(
        "tapTime"
      ).textContent =
        tapTime;


      if (tapTime <= 0) {

        clearInterval(tapInterval);

        tapInterval = null;

        saveArcadeScore(
          "Neon Tap",
          tapScore
        );

        area.innerHTML =
          `<p style="padding:20px">
             Game over! Score: ${tapScore}
           </p>`;

        return;

      }


      spawnTarget();

    }, 1000);


  spawnTarget();

}


function spawnTarget() {

  const area =
    document.getElementById("tapArea");


  area.querySelectorAll(".tap-target")
    .forEach(x => x.remove());


  const target =
    document.createElement("button");


  target.className =
    "tap-target";


  target.style.left =
    Math.random() *
    Math.max(10, area.clientWidth - 60) +
    "px";


  target.style.top =
    Math.random() *
    Math.max(10, area.clientHeight - 60) +
    "px";


  target.onclick = () => {

    tapScore++;

    document.getElementById(
      "tapScore"
    ).textContent =
      tapScore;

    sound("click");

    spawnTarget();

  };


  area.appendChild(target);

}


/* =========================
   MEMORY
========================= */

const memorySymbols =
  ["🌟","🚀","🌙","💎","🌟","🚀","🌙","💎"];


let memoryFirst = null;
let memoryLock = false;
let memoryMatches = 0;


document
  .getElementById("startMemoryBtn")
  .onclick = startMemory;


function startMemory() {

  memoryFirst = null;
  memoryLock = false;
  memoryMatches = 0;


  const values =
    [...memorySymbols]
      .sort(() => Math.random() - .5);


  const grid =
    document.getElementById(
      "memoryGrid"
    );


  grid.innerHTML = "";


  values.forEach(symbol => {

    const card =
      document.createElement("button");


    card.className =
      "memory-card";


    card.textContent = "?";


    card.onclick = () => {

      if (
        memoryLock ||
        card.classList.contains("revealed")
      ) return;


      card.classList.add("revealed");

      card.textContent = symbol;


      if (!memoryFirst) {

        memoryFirst = {
          card,
          symbol
        };

        return;

      }


      if (
        memoryFirst.symbol === symbol
      ) {

        memoryMatches++;

        memoryFirst = null;


        if (memoryMatches === 4) {

          addXP(25);

          saveArcadeScore(
            "Memory",
            4
          );

        }


      } else {

        memoryLock = true;


        setTimeout(() => {

          card.classList.remove(
            "revealed"
          );

          card.textContent = "?";


          memoryFirst.card.classList.remove(
            "revealed"
          );

          memoryFirst.card.textContent = "?";


          memoryFirst = null;
          memoryLock = false;

        }, 650);

      }

    };


    grid.appendChild(card);

  });

}


/* =========================
   UTILITIES
========================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


/* =========================
   START
========================= */

initialize();
