# Learning Journal – Pac-Man Project

My personal journal for this project. I fill in each section (in Hebrew) at the end of each stage.

---

## Stage 0 – Environment
### Concepts
### What I understood
### Open questions

---

## Stage 1 – Planning
### Concepts
### What I understood
### Open questions

---

## Stage 2 – Skeleton & Game Loop
### Concepts
### What I understood
### Open questions

---

## Stage 3 – Maze
### Concepts
### What I understood
### Open questions

---

## Stage 4 – Pac-Man Movement
### Concepts
### What I understood
### Open questions

---

## Stage 5 – Eating & Score
### Concepts
### What I understood
### Open questions

---

## Stage 6 – Ghosts Structure
### Concepts
### What I understood
### Open questions

---

## Stage 7 – Ghost AI
### Concepts
### What I understood
### Open questions

---

## Stage 8 – Game Rules
### Concepts
### What I understood
### Open questions

---

## Stage 9 – Fruits & Bonuses
### Concepts
### What I understood
### Open questions

---

## Stage 10 – UI Screens
### Concepts
### What I understood
### Open questions

---

## Stage 11 – Pixel Art & Animation
### Concepts
### What I understood
### Open questions

---

## Stage 12 – Sound
### Concepts
- **AudioContext:** "מנוע הצליל" של הדפדפן. נוצר רק אחרי מקש או קליק ראשון (מדיניות autoplay), ואפשר להשהות אותו (`suspend`) ולהמשיך (`resume`): הצליל קופא באמצע התו וממשיך משם.
- **AudioBuffer ו-BufferSource:** קובץ MP3 מפוענח פעם אחת לזיכרון (buffer); כל ניגון הוא source חדש וזול. לכן אפשר לנגן כמה עותקים של אותו צליל בבת אחת.
- **גרף צליל (nodes):** source -> gain (עוצמה) -> bus -> master -> compressor -> limiter -> רמקולים. כל חוליה עושה דבר אחד.
- **Bus (ערוץ):** קבוצת צלילים עם עוצמה משותפת: sfx לאפקטים, music למוזיקה ולופים, ui לממשק.
- **Manifest:** טבלה אחת שממפה שם צליל לקובץ ולהגדרות שלו. שאר הקוד מכיר רק שמות.
- **One-shot מול loop:** one-shot מתנגן פעם אחת ונגמר לבד; לופ חוזר על עצמו עד שעוצרים אותו (loopStart / loopEnd).
- **Trim ו-slice:** דילוג על השקט שבתחילת הקובץ (encoder delay של MP3) או ניגון רק של חלק ממנו (פגיעה אחת מתוך dot-eat.mp3).
- **Polyphony (maxVoices):** כמה עותקים של אותו צליל מותר לנגן בבת אחת; הישן נדחק בדעיכה קצרה.
- **Fade ו-ramp:** שינוי עוצמה הדרגתי במקום חיתוך, כדי שלא יישמע "קליק".
- **Ducking:** הנמכה זמנית של מוזיקת הרקע כדי שצליל חשוב יבלוט (אכילת רוח, חיים נוספים).
- **Pub/sub לצלילים:** המשחק רק מכריז על אירועים (`emit`); soundEffects.js מאזין ומחליט מה לנגן. המשחק לא יודע שיש צליל.
- **פונקציה טהורה (pure):** `getActiveLoop(snapshot)` מחזירה תמיד אותה תשובה לאותו מצב, ולכן קל לבדוק אותה ואין "לופ ששכחו לעצור".
- **dB ו-RMS:** מדידת עוצמה "כפי שנשמעת". 6 dB פחות זה בערך חצי עוצמה; ככה בדקנו שצלילים חשובים לא נבלעים.

### What I understood
- למה עזבנו סינתזה בקוד לטובת קבצי MP3: קל יותר לבחור צליל לפי האוזן, והקוד נשאר אחראי רק על התזמון והמיקס.
- למה צליל נקודה הוא פגיעה אחת לכל נקודה ולא לופ: הוא עוקב אחרי הקצב האמיתי של האכילה ונגמר לבד.
- למה כל לופ מוחלט במקום אחד בלבד: אחרת קל להשאיר לופ מתנגן אחרי מוות, סיום שלב או השהיה.
- למה השהיה מקפיאה את ה-AudioContext ולא עוצרת את הלופ: אחרת הוא היה מתחיל מההתחלה אחרי P.

### Open questions
- האם להוסיף בהמשך את הסירנה (background-loop) ואת צליל השיא החדש (new-high-score)?
- איך לבדוק צלילים בבדיקות אוטומטיות (שלב 13) בלי לשמוע אותם?

---

## Stage 13 – Quality & Tests
### Concepts
### What I understood
### Open questions

---

## Stage 14 – Deploy
### Concepts
### What I understood
### Open questions
