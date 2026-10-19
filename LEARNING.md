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
- **Autoplay ו-user activation (12.15):** הדפדפן מרשה לנגן רק אחרי פעולה של המשתמש (מקש, קליק, נגיעה). לא כל מקש נחשב: Escape למשל יוצר AudioContext שנשאר נעול. לכן ה-hint נעלם רק כשה-context באמת רץ (`isAudioUnlocked`), ולא כשהוא רק נוצר.
- **"רוצים" מול "מתנגן":** getActiveLoop אומר שהמוזיקה רצויה כבר בטעינה; audio.js שומר את הבקשה (`wantedLoops`) ומתחיל אותה ברגע שמותר. אין צורך בקוד מיוחד ל"מקש הראשון".
- **לולאה מוזיקלית חלקה:** אורך הלולאה צריך להיות מספר שלם של משפטים מוזיקליים. מצאנו את האורך (2.615807 שניות) ב-correlation: משווים את הפתיחה לכל מקום אחר בקובץ ומחפשים איפה היא חוזרת. חותכים לפני אקורד הסיום ולא בסוף הקובץ, כך שהסוף נכנס ישר לפתיחה.
- **Fade לכל לופ:** שדות manifest `loopFadeInSeconds` / `loopFadeOutSeconds`: מוזיקת הפתיחה נכנסת לאט (0.5 שניות) ויוצאת מהר (0.15), והג'ינגל מחכה בדיוק את זמן היציאה כדי שלא תהיה חפיפה.

### What I understood
- למה עזבנו סינתזה בקוד לטובת קבצי MP3: קל יותר לבחור צליל לפי האוזן, והקוד נשאר אחראי רק על התזמון והמיקס.
- למה צליל נקודה הוא פגיעה אחת לכל נקודה ולא לופ: הוא עוקב אחרי הקצב האמיתי של האכילה ונגמר לבד.
- למה כל לופ מוחלט במקום אחד בלבד: אחרת קל להשאיר לופ מתנגן אחרי מוות, סיום שלב או השהיה.
- למה השהיה מקפיאה את ה-AudioContext ולא עוצרת את הלופ: אחרת הוא היה מתחיל מההתחלה אחרי P.
- (12.15) שפתיחת הסאונד בכל מקש כבר עבדה משלב 12A; Enter רק נראה כמו "המפתח" כי עד עכשיו לא היה מה לשמוע במסך הפתיחה. בדיקה בקוד (gap review) לפני כתיבה חסכה שינוי מיותר.
- (12.15) שמוזיקה שחוזרת "מההתחלה" בחזרה למסך הפתיחה לא דורשת קוד: תשובה חדשה של getActiveLoop = voice חדש מתחילת ה-trim.
- (12.15) שתהליכי בדיקה צריך לסגור עד הסוף: דפדפני headless שנשארו פתוחים ניגנו את המוזיקה ברמקולים בלי שום חלון.

### Open questions
- האם להוסיף בהמשך את הסירנה (background-loop) ואת צליל השיא החדש (new-high-score)?
- איך לבדוק צלילים בבדיקות אוטומטיות (שלב 13) בלי לשמוע אותם?

---

## Stage 13 – Quality & Tests
### Concepts
- **Code review:** קריאה שיטתית של כל הקוד בלי לשנות אותו. כל ממצא מקבל מזהה (B1, T1...), קטגוריה, חומרה, מאמץ וסיכון תיקון, והחלטה: Now או Later (REVIEW.md).
- **בדיקה אוטומטית (node:test):** קוד שבודק קוד. `npm test` מריץ את כל הקבצים ב-tests/ בתוך Node, בלי דפדפן, ומדווח מה עבר ומה נכשל.
- **פונקציה טהורה = קלה לבדיקה:** אותו קלט נותן תמיד אותו פלט, אז הבדיקה רק משווה תשובה (למשל `clydeChaseTarget`, `getLevelConfig`).
- **Fake (זיוף):** אובייקט פשוט שמחליף את הדפדפן בבדיקה: Web Audio מזויף, `localStorage` מזויף, `fetch` שמשהה קובץ, ו-input מזויף.
- **הזרקת תלות (T1):** `Game({ input })` מקבל את המקלדת מבחוץ במקום לקרוא ל-input.js בעצמו. במשחק מעבירים את input.js, ובבדיקה אובייקט מזויף.
- **מצב משותף ובידוד בדיקות (T2):** מודול שמחזיק ניקוד או מאזינים אחד לכל התוכנית גורם לבדיקות להשפיע זו על זו. לכן יש `clearAllListeners` ו-`resetScore` לפני כל בדיקה.
- **בדיקה שנכשלת קודם:** כותבים בדיקה שמראה את הבאג (נכשלת), ורק אחר כך מתקנים עד שהיא עוברת (B2: commit לבדיקות, ואז commit לתיקון).
- **בדיקת `todo`:** בדיקה של באג ידוע שעוד לא תוקן. היא לא מפילה את `npm test`, ואחרי התיקון מסירים את ה-`todo` (B9).
- **רשימת באגים מהמשחק (BUGS.md):** באגים שרואים תוך כדי משחק, נפרד מ-REVIEW.md (באגים שנמצאו בקריאת קוד).

### What I understood
- למה קודם סקירה ורק אחר כך תיקונים: רואים את כל הבעיות יחד ומחליטים מה חשוב עכשיו לפי חומרה וסיכון.
- למה T1 היה הממצא החשוב: בלעדיו אי אפשר היה להריץ את `Game` בבדיקה בלי לחקות את הדפדפן ואת main.js.
- למה כל תיקון ב-commit משלו עם המזהה מ-REVIEW.md: קל למצוא מה תוקן, מתי ולמה.
- שבדיקה מוכיחה רק את מה שהיא בודקת: בדיקות הניקוד קוראות לפונקציות ישירות, אז חיווט שבור בין המודולים לא היה נתפס.

### Open questions
- האם לבדוק עכשיו את פערי 13C-2 (power pellet ושרשרת הרפאים דרך אירועים, התנגשות דרך `Game.update`), כי T1 כבר מאפשר את זה?
- מה מתוך הממצאים שסומנו Later שווה לתקן לפני הפרסום (B4, T3, P1)?
- בדיקת שחקן (13F) נדחתה לאחרי הפרסום: מי יבדוק, ואיך נאסוף את מה שהוא מוצא ל-BUGS.md?

---

## Stage 14 – Deploy
### Concepts
### What I understood
### Open questions
