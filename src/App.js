import { useEffect, useRef, useState } from "react";

import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { BookmarkIcon, XMarkIcon } from "@heroicons/react/24/outline";
import classnames from "classnames";
import { DateTime, Settings } from "luxon";

// Server time
Settings.defaultZoneName = "utc";
const a = (2 * Math.PI) / 6;
const r = 50;

function getHexagonPoints(x, y) {
  const points = [];
  for (var i = 0; i < 6; i++) {
    points.push([x + r * Math.cos(a * i), y + r * Math.sin(a * i)]);
  }
  return points;
}

let startX = r;
let startY = r * Math.sin(a);

function shuffleArray(array) {
  const copy = JSON.parse(JSON.stringify(array));
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}
const levels = {
  Newbie: 0,
  Novice: 0.02,
  Fine: 0.05,
  Skilled: 0.08,
  Excellent: 0.15,
  Superb: 0.25,
  Marvellous: 0.4,
  Outstanding: 0.5,
  "Queen Bee 🐝": 0.7,
};

const isPangram = (word, gameLetters) => {
  return gameLetters.split("").every((letter) => word.includes(letter));
};

const getWordScore = (word, gameLetters) => {
  if (word.length === 4) return 1;
  if (isPangram(word, gameLetters)) {
    return word.length + 7;
  }
  return word.length;
};

const convertDateString = (dateStr) => {
  if (!dateStr) {
    return null;
  }
  dateStr = dateStr.trim()
  if (dateStr === "") {
    return null;
  }
  if (dateStr.length !== 8) {
    return null;
  }
  const yyyy = parseInt(dateStr.slice(0, 4));
  const mm = parseInt(dateStr.slice(4, 6));
  const dd = parseInt(dateStr.slice(6, 8));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return null;
  }
  return yyyy + "-" + ("0" + mm).slice(-2) + "-" + ("0" + dd).slice(-2);
};

const getToday = () => {
  return DateTime.now()
      .setZone(Settings.defaultZoneName)
      .set({hour: 0, minute: 0, second: 0, millisecond: 0});
};

const getYesterday = () => {
  return getToday().plus({ days: -1 });
};

const formatDate = (dt) => {
  return dt.toFormat("yyyyLLdd");
};

const parseDateForMessage = (dateStr) => {
  const dt = DateTime.fromFormat(dateStr, "yyyyLLdd");
  return dt.toLocaleString(DateTime.DATE_MED);
};

const oldestPuzzleDate = DateTime.fromObject({year: 2020, month: 1, day: 1}).setZone(Settings.defaultZoneName).set({hour: 0, minute: 0, second: 0, millisecond: 0})
const puzzleBase = "https://ping.github.io/freebee-static/puzzles/"
const hashParams = URLSearchParams && new URLSearchParams(document.location.hash.substring(1));

function App() {
  const [day, setDay] = useState(hashParams.get("day"));
  const dateInputRef = useRef(null);
  const [game, setGame] = useState();
  useEffect(() => {
    const today = getToday();
    let endpoint = puzzleBase + formatDate(today) + ".json";
    hashParams.set("day", formatDate(today));
    if (day) {
      endpoint = puzzleBase + day + ".json";
      hashParams.set("day", day);
      if (dateInputRef.current) {
        dateInputRef.current.value = convertDateString(day);
      }
      setMessage("Puzzle for " + parseDateForMessage(day));
    } else {
      if (dateInputRef.current) {
        dateInputRef.current.value = convertDateString(formatDate(today));
      }
      setMessage("Puzzle for Today");
    }
    document.location.replace("#" + hashParams.toString());
    fetch(endpoint)
      .then((res) => {
        if (!res.ok) {
          console.error(res);
          return;
        }
        return res.json();
      })
      .then(setGame);
  }, [day]);

  const [positions, setPositions] = useState([
    [-2, -3],
    [-2, 3],
    [2, -3],
    [2, 3],
    [-4, 0],
    [4, 0],
  ]);
  const reshuffle = () => setPositions((prev) => shuffleArray(prev));

  const [guess, setGuess] = useState("");

  const [guessed, setGuessed] = useState([]);
  const localRef = useRef();
  useEffect(() => {
    if (!game) return;
    localRef.current = "guessed_" + game.letters + "_" + game.center;
    let restoreFromData = false;
    if (hashParams.get("data")) {
      const data = atob(hashParams.get("data")).split("|");
      restoreFromData = (game.letters + game.center) === data[0];
      if (restoreFromData) {
        setGuessed(data[1].split(","))
        setMessage("Restored game guesses");
      }
      hashParams.delete("data");
      document.location.replace("#" + hashParams.toString());
    }
    if (!restoreFromData) {
      setGuessed(
        JSON.parse(window.localStorage.getItem(localRef.current) ?? "[]")
      );
    }
  }, [game]);
  useEffect(() => {
    if (!localRef.current) return;
    window.localStorage.setItem(localRef.current, JSON.stringify(guessed));
  }, [guessed]);

  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 2000);
    return () => clearTimeout(timeout);
  }, [message]);

  const [showingPoints, setShowingPoints] = useState(0);
  const [showPointsState, setShowPointsState] = useState("idle");
  const showPointNotification = (points) => {
    setShowingPoints(points);
    setShowPointsState("in");
    setTimeout(() => setShowPointsState("out"), 200);
    setTimeout(() => setShowPointsState("idle"), 400);
    setTimeout(() => setShowingPoints(0), 400);
  };

  const handleEnter = (e) => {
    e.preventDefault();
    setMessage("");
    setGuess("");
    if (guessed.includes(guess)) return setMessage("Already found");
    if (guess.length < 4) return setMessage("Too short");
    if (!guess.includes(game.center)) {
      return setMessage("Missing center letter");
    }

    if (!game.wordlist.includes(guess)) {
      return setMessage("Not in word list");
    }
    showPointNotification(getWordScore(guess, game.letters));
    if (isPangram(guess, game.letters)) { setMessage("PANGRAM!"); }
    setGuessed((prev) => [...prev, guess]);
  };

  const handleDateChange = (e) => {
    const inputDate = e.target.valueAsDate;
    const selectedDate = DateTime.fromObject({
        year: inputDate.getFullYear(),
        month: inputDate.getMonth() + 1,
        day: inputDate.getDate()
    }, {zone: Settings.defaultZoneName}).set({hour: 0, minute: 0, second: 0, millisecond: 0});
    const today = getToday();
    if (selectedDate > today) {
      return setMessage("Future date");
    }
    if (selectedDate < oldestPuzzleDate) {
      return setMessage("No puzzle available before " + oldestPuzzleDate.toFormat("yyyy.LL.dd"));
    }
    const delta = today - selectedDate;
    if (delta === 0) {
      setDay(null);
      return;
    }
    if (delta <= (60 * 60 * 24 * 1000)) {
      setDay("yesterday");
      return;
    }
    setDay(formatDate(selectedDate));
  };

  const handleTodayClick = (e) => {
    const today = getToday();
    setDay(formatDate(today));
  };

  const handleYesterdayClick = (e) => {
    const yesterday = getYesterday();
    setDay(formatDate(yesterday));
  };

  const handleRandomClick = (e) => {
    const diffInDays = getToday().diff(oldestPuzzleDate, "days");
    const max = diffInDays.values.days;
    const min = 0;
    const dayDelta = Math.floor(Math.random() * (max - min + 1)) + min;
    setDay(formatDate(oldestPuzzleDate.plus({days: dayDelta})));
  };

  const copyContinueGameLink = (e) => {
    const cloneHashParams = new URLSearchParams();
    cloneHashParams.set("day", hashParams.get("day"))
    cloneHashParams.set("data", btoa(game.letters + game.center + "|" + guessed.join(",")))
    const loc = window.location;
    const clonedUrl = loc.protocol + "//" + loc.host + loc.pathname + "#" + cloneHashParams.toString();
    navigator.clipboard.writeText(clonedUrl);
    setMessage("Copied game link")
  };

  useEffect(() => {
    const listener = (e) => {
      if (e.key === "Backspace") return setGuess((prev) => prev.slice(0, -1));
      if (e.key === "Enter") return handleEnter(e);
      if (e.keyCode >= 65 && e.keyCode <= 90) {
        setGuess((prev) => prev + e.key);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  });

  const [showGuessed, setShowGuessed] = useState(false);
  const [showLevels, setShowLevels] = useState(false);

  if (!game) return;

  const score = guessed.reduce((total, curGuess) => {
    return getWordScore(curGuess, game.letters) + total;
  }, 0);

  const level = Object.entries(levels).reduce((prev, [name, cur]) => {
    if (score >= parseInt(game.total * cur)) return { name, level: cur };
    return prev;
  }, {});

  if (showGuessed) {
    return (
      <div className="dark:bg-slate-800 h-screen flex flex-col justify-center items-center">
        <div className="absolute top-0 right-0 p-6 text-slate-400">
          <ParentButton onClick={() => setShowGuessed(false)}>
            <XMarkIcon className="w-10" />
          </ParentButton>
        </div>
        <div className="w-80 overflow-y-auto px-6 my-16">
          <div className="flex dark:text-slate-100 font-bold">
            <div className="flex-1">Word</div>
            <div className="flex-none">Score</div>
          </div>
          {[...guessed].sort((a, b) => a > b ? 1 : -1).map((g) => (
            <div key={g} className={classnames(
              "flex", isPangram(g, game.letters) ? "text-pink-500 dark:text-pink-400" : "dark:text-slate-100")}>
              <div className="flex-1">{g}</div>
              <div className="flex-none">{getWordScore(g, game.letters)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (showLevels) {
    const levelEntries = Object.entries(levels);
    return (
      <div className="dark:bg-slate-800 h-screen flex flex-col justify-center items-center overflow-y-auto">
        {levelEntries.map(([level_name, level_ratio], i) => (
          <div key={level_name} className="w-60">
            <div className={classnames(
              "px-2 mt-2 rounded flex",
              level.name === level_name ? "bg-pink-400 text-white"
                : score > parseInt(level_ratio * game.total) ? "text-gray-400" : "dark:text-slate-100"
            )}>
              <div className="flex-grow">
                {level.name === level_name ?
                  <span className="rounded-lg mr-1 text-sm bg-white text-black dark:text-white dark:bg-slate-800 px-1">{score}</span>
                  : ""}
                {level_name}
              </div>
              <div className="flex-none flex justify-center"><span>{parseInt(level_ratio * game.total)}</span></div>
            </div>
            {level.name === level_name && levelEntries.length > (i + 1) ?
              <div className="w-full dark:text-white px-2 text-xs flex justify-center mt-1">
                {parseInt(levelEntries[i + 1][1] * game.total) - score} point(s) to next level
              </div> : ""}
          </div>
        )).reverse()}
        <div className="absolute top-0 right-0 p-8 text-slate-400">
          <ParentButton onClick={() => setShowLevels(false)}>
            <XMarkIcon className="w-10" />
          </ParentButton>
        </div>
      </div>
    );
  }
  return (
    <div className="dark:bg-slate-800 fixed inset-0 flex flex-col items-center justify-center">
      <Toast message={message} />
      <div className="absolute top-0 left-0 w-full p-4 space-y-8">
        <div className="flex items-center space-x-1">
          <div className="flex items-center space-x-1 flex-grow overflow-x-auto">
            {[...guessed].reverse().map((g) => (
              <div
                key={g}
                className={classnames(
                  "text-xs uppercase text-gray-400",
                  isPangram(g, game.letters) ? "font-bold" : "font-light"
                )}
              >
                {g}
              </div>
            ))}
          </div>
          <ParentButton
            onClick={() => setShowGuessed(true)}
            className="text-xs text-gray-500 dark:text-gray-300 font-light pl-2"
          >
            Show all ({guessed.length})
          </ParentButton>
        </div>
        <div className="flex items-center space-x-8 dark:text-slate-100">
          <ParentButton
            onClick={() => setShowLevels(true)}
            className="font-semibold whitespace-nowrap"
          >
            {level.name}
          </ParentButton>
          <Example currentLevel={level.level} score={score} />
        </div>
      </div>

      <div className="relative text-4xl font-light text-center h-20 flex items-center focus:outline-none space-x-0.5 select-none">
        <div
          className={classnames(
            " rounded absolute top-1/2 left-1/2 -translate-x-1/2 p-2 transition-all duration-200 dark:text-white",
            showPointsState === "out" && "-translate-y-32 opacity-0",
            showPointsState === "in" && "-translate-y-24 opacity-100",
            showPointsState === "idle" && "-translate-y-1/2 opacity-0"
          )}
        >
          +{showingPoints}
        </div>
        <div className="dark:text-white">
          {guess.split("").map((a, i) => (
              <span key={i} className={classnames(
                  a === game.center ?
                      "text-pink-500 dark:text-pink-400"
                      : (game.letters.split("").indexOf(a)) < 0 ? "text-gray-400" : "")
              }>
                {a}
              </span>
          ))}
        </div>
        <Caret />
      </div>
      <div
        style={{
          height: 5 * r,
          position: "relative",
          width: 3 * r * Math.sin(a) * 2,
          padding: "20px 0px",
        }}
      >
        <Polygon
          offsetX={0}
          offsetY={0}
          center
          letter={game.center}
          onClick={() => setGuess((prev) => prev + game.center)}
        />
        {game.letters.split("").map((letter, i) => (
          <Polygon
            key={letter}
            letter={letter}
            offsetX={positions[i][0]}
            offsetY={positions[i][1]}
            onClick={() => setGuess((prev) => prev + letter)}
          />
        ))}
      </div>
      <div
        className="flex flex-col pt-8 fixed bottom-0 w-full p-8 items-center
      "
      >
        <div className="w-full flex justify-center space-x-4">
          <Button onClick={() => setGuess((prev) => prev.slice(0, -1))}>
            Delete
          </Button>
          <Button onClick={reshuffle}>
            <ArrowPathIcon className="w-6 text-slate-400 dark:text-slate-300" />
          </Button>
          <Button onClick={handleEnter}>Enter</Button>
        </div>
        <div className="text-sm font-extralight dark:text-white pt-4 space-x-4 flex flex-wrap justify-center">
          <input ref={dateInputRef} type="date" className="p-1 border-slate-300 rounded-md border border-1 bg-white dark:text-white dark:bg-slate-800" onChange={handleDateChange} defaultValue={convertDateString(formatDate(getToday()))} />
          <button onClick={handleRandomClick}>random</button>
          <button className={classnames(day === formatDate(getYesterday()) ? "hidden": "")} onClick={handleYesterdayClick}>yesterday</button>
          <button className={classnames(!day || day === formatDate(getToday()) ? "hidden": "")} onClick={handleTodayClick}>today</button>
          <button className="align-text-bottom" title="Copy game link to continue on another device" onClick={copyContinueGameLink}><BookmarkIcon className="w-4 text-slate-400 dark:text-slate-300"/></button>
        </div>
      </div>
    </div>
  );
}

const Toast = (props) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!!props.message);

    return () => {
      setShow(false);
    };
  }, [props.message]);
  return (
    <div
      className={classnames(
        "absolute top-0 pt-8 z-50 transform transition-all",
        !show ? "-translate-y-full opacity-0" : "opacity-100"
      )}
    >
      <div className="bg-gray-800 text-white p-2 rounded-lg dark:bg-gray-50 dark:text-black">
        {props.message}
      </div>
    </div>
  );
};

const Caret = () => {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => setShow((prev) => !prev), 700);
    return () => clearInterval(interval);
  });
  return (
    <div
      className={classnames(
        show ? "visible" : "invisible",
        "h-8 w-0.5 bg-stone-600 dark:bg-stone-300"
      )}
    />
  );
};

const ParentButton = (props) => {
  const [mouseDown, setMouseDown] = useState(false);

  return (
    <button
      onMouseDown={() => setMouseDown(true)}
      onMouseUp={() => setMouseDown(false)}
      onTouchStart={() => setMouseDown(true)}
      onTouchEnd={() => setMouseDown(false)}
      onMouseLeave={() => setMouseDown(false)}
      style={{ WebkitTapHighlightColor: "transparent" }}
      {...props}
      className={classnames(
        mouseDown && "scale-75 opacity-80",
        "select-none whitespace-nowrap",
        props.className
      )}
    />
  );
};

const Button = (props) => {
  return (
    <ParentButton
      className={classnames(
        "rounded-2xl border-slate-300 border px-6 py-4 text-slate-700 font-extralight transition-all transform dark:text-white"
      )}
      {...props}
    />
  );
};

const Polygon = (props) => {
  const [mouseDown, setMouseDown] = useState(false);

  useEffect(() => {
    const listener = (e) => {
      if (e.key === props.letter) setMouseDown(true);
    };
    const upListener = () => setMouseDown(false);
    window.addEventListener("keydown", listener);
    window.addEventListener("keyup", upListener);
    return () => {
      window.removeEventListener("keydown", listener);
      window.removeEventListener("keyup", upListener);
    };
  }, [props.letter]);
  return (
    <svg
      width={r * 2}
      height={r * Math.sin(a) * 2}
      className={classnames(
        "top-1/2 left-1/2 absolute transition-all duration-150",
        mouseDown && "opacity-60"
      )}
      style={{
        transform: `translate(${(-50 + props.offsetY * 25).toString()}%, ${(
          -50 +
          props.offsetX * 25
        ).toString()}%) ${!mouseDown ? "scale(0.95)" : "scale(0.8)"}`,
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseDown={() => setMouseDown(true)}
      onTouchStart={() => setMouseDown(true)}
      onTouchEnd={() => setMouseDown(false)}
      onMouseUp={() => setMouseDown(false)}
      onMouseLeave={() => setMouseDown(false)}
      onClick={props.onClick}
    >
      <polygon
        className={props.center ? "fill-pink-400" : "fill-stone-300"}
        points={getHexagonPoints(startX, startY)
          .map((p) => p.join(","))
          .join(" ")}
      />
      <text
        x="50%"
        y="50%"
        dy="0.35em"
        className={classnames(
          "text-2xl align-middle font-black fill-stone-700 select-none pointer-events-none",
          props.center && "fill-pink-900"
        )}
        style={{
          textAnchor: "middle",
        }}
      >
        {props.letter.toUpperCase()}
      </text>
    </svg>
  );
};

export default App;

function Example(props) {
  const isLast = (stepIdx) =>
    stepIdx === Object.entries(levels).length - 1 ? "flex-1" : "";
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between w-full">
        {Object.entries(levels).map(([name, level], stepIdx) => (
          <li
            key={name}
            className={classnames(!isLast(stepIdx) ? "flex-1" : "", "relative")}
          >
            {level < props.currentLevel ? (
              <>
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className="h-0.5 w-full bg-pink-400" />
                </div>
                <div
                  href="#"
                  className="relative flex h-2 w-2 items-center justify-center rounded-full bg-pink-400"
                ></div>
              </>
            ) : level === props.currentLevel ? (
              <>
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div
                  href="#"
                  className={classnames(
                    isLast(stepIdx) ? "" : "-translate-x-1/3",
                    "relative flex transform h-6 w-6 items-center justify-center rounded-full bg-pink-400 text-white text-xs font-semibold"
                  )}
                  aria-current="step"
                >
                  {props.score}
                </div>
              </>
            ) : (
              <>
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div
                  href="#"
                  className="group relative flex h-2 w-2 items-center justify-center rounded-full border-2 border-gray-300 bg-white hover:border-gray-400"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300"
                    aria-hidden="true"
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
