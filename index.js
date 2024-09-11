// helpers
function rotate(arr, n) {
  return arr.slice(n, arr.length).concat(arr.slice(0, n));
}

// audio file handling
const AUDIO_FILES = {};

function toFileName(note, octave) {
  const { note: newNote, octave: newOctave } = canonicalNoteName(note, octave);
  return `notes/${newNote.replace(/#/g, "-sharp")}${newOctave}.mp3`;
}

function loadAudioFiles() {
  const notes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  let currentNote = START_NOTE;
  let currentOctave = START_OCTAVE;

  while (true) {
    const fileName = toFileName(currentNote, currentOctave);
    const audio = new Audio(fileName);
    audio.preload = "auto";
    AUDIO_FILES[`${currentNote}${currentOctave}`] = audio;
    if (currentNote === END_NOTE && currentOctave === END_OCTAVE) {
      break;
    }
    currentOctave = currentNote === "B" ? currentOctave + 1 : currentOctave;
    currentNote = notes[(notes.indexOf(currentNote) + 1) % notes.length];
  }
}

// metronome
function metronome(bpm, callback) {
  let countIn = 4;
  const metronomeTone = new Audio("notes/metronome.mp3");
  const interval = 60000 / bpm;
  const intervalId = setInterval(() => {
    if (countIn > 0) {
      metronomeTone.play();
      countIn--;
      return;
    }
    callback();
  }, interval);
  return () => clearInterval(intervalId);
}

let stopMetronome = null;

// Full range of the guitar
const START_NOTE = "E";
const START_OCTAVE = 2;
const END_NOTE = "C";
const END_OCTAVE = 6;

// 3 notes per string x 6 strings
const NOTE_COUNT = 18;

const HALF_STEP = "H";
const WHOLE_STEP = "W";

const IONIAN_MODE = [
  WHOLE_STEP,
  WHOLE_STEP,
  HALF_STEP,
  WHOLE_STEP,
  WHOLE_STEP,
  WHOLE_STEP,
  HALF_STEP,
];

const MODES = {
  IONIAN: IONIAN_MODE,
  DORIAN: rotate(IONIAN_MODE, 1),
  PHRYGIAN: rotate(IONIAN_MODE, 2),
  LYDIAN: rotate(IONIAN_MODE, 3),
  MIXOLYDIAN: rotate(IONIAN_MODE, 4),
  AEOLIAN: rotate(IONIAN_MODE, 5),
  LOCRIAN: rotate(IONIAN_MODE, 6),
};

function incrementNote(note, octave, step) {
  const numberOfSharps = note.match(/#/g)?.length || 0;
  const baseNote = note.replace(/#/g, "");
  const upOctave = baseNote === "B";

  const newBaseNote =
    baseNote === "G" ? "A" : String.fromCharCode(baseNote.charCodeAt(0) + 1);
  const newNumberOfSharps =
    (baseNote === "B" || baseNote === "E" ? -1 : -2) +
    numberOfSharps +
    (step === WHOLE_STEP ? 2 : 1);

  return {
    note: `${newBaseNote}${"#".repeat(newNumberOfSharps)}`,
    octave: upOctave ? octave + 1 : octave,
  };
}

function generateMode(mode, startingNode, startingOctave) {
  let currentNote = startingNode;
  let currentOctave = startingOctave;
  let notes = [];
  for (let i = 0; i < NOTE_COUNT; i++) {
    notes.push({ note: currentNote, octave: currentOctave });
    const step = mode[i % mode.length];
    const nextNote = incrementNote(currentNote, currentOctave, step);
    currentNote = nextNote.note;
    currentOctave = nextNote.octave;
  }
  return notes;
}

function canonicalNoteName(note, octave) {
  const baseNote = note.replace(/#/g, "");
  let isSharp = note.includes("#");
  const isDoubleSharp = note.includes("##");

  let canonicalNote = baseNote;
  let newOctave = octave;

  if (isSharp) {
    if (baseNote === "B") {
      canonicalNote = "C";
      isSharp = false;
      newOctave++;
    } else if (baseNote === "E") {
      canonicalNote = "F";
      isSharp = false;
    } else if (isDoubleSharp) {
      canonicalNote =
        baseNote === "G"
          ? "A"
          : String.fromCharCode(baseNote.charCodeAt(0) + 1);
      isSharp = false;
    }
  }

  return {
    note: `${canonicalNote}${isSharp ? "#" : ""}`,
    octave: newOctave,
  };
}

let currentMode = null;

function getNotes(mode, startingNote) {
  const startingOctave = ["C", "D"].includes(startingNote) ? 3 : 2;
  return generateMode(MODES[mode], startingNote, startingOctave);
}

function updateMode() {
  stop();
  const modeValue = document.getElementById("mode").value;
  const startingNote = document.getElementById("startingNote").value;
  currentMode = getNotes(modeValue, startingNote);

  const notes = currentMode
    .slice(0, 8)
    .map((note) => note.note.replace(/\d/g, ""));
  const notesElement = document.getElementById("notes");
  notesElement.innerHTML = notes.join(" ");
}

function play() {
  stop();

  const bpm = parseInt(document.getElementById("bpm").value);

  let index = 0;
  let goingUp = true;

  stopMetronome = metronome(bpm, () => {
    const { note, octave } = currentMode[index];
    const { note: canonicalNote, octave: canonicalOctave } = canonicalNoteName(
      note,
      octave
    );
    const audio = AUDIO_FILES[`${canonicalNote}${canonicalOctave}`];
    if (audio) {
      audio.play();
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 60000 / (bpm * 2));
    }

    const noteElement = document.getElementById("note");
    noteElement.innerHTML = `${note}${octave}`;

    if (index === currentMode.length - 1) {
      goingUp = false;
    } else if (index === 0) {
      goingUp = true;
    }

    index += goingUp ? 1 : -1;
  });
}

function stop() {
  if (stopMetronome) {
    stopMetronome();
    stopMetronome = null;
  }
  const noteElement = document.getElementById("note");
  noteElement.innerHTML = "";
}
