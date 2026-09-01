# Pravisti Siri-Style Hands-Free Voice Integration Guide for Mobile App

Yeh complete guide **Mobile App Developer (Flutter / React Native / iOS / Android)** ke liye hai. Iska main goal app me **iPhone Siri jaisa 100% hands-free voice experience** dena hai jahan App me koi complex business logic nahi hoga — App sirf **Voice Mouth & Ears** (Speech-to-Text + Text-to-Speech) ki tarah kaam karega aur saari intelligence Backend sambhaale ga.

---

## 🎯 Core Concept
App side par 0% complex logic. App ka role sirf 2 cheezo tak seemit hai:
1. **Mouth (Speaker):** Backend ke `promptMessage` ko Text-To-Speech (TTS) dwara user ko bol kar sunana.
2. **Ears (Microphone):** User ki aawaz ko Speech-To-Text (STT) dwara convert karke Backend ko bhejna.

---

## 🚫 Strict DONTs (App Me Kya NAHI Karna Hai)

1. **NO Local NLP / Intent Detection:** App side par koi intent (Company, Deal, Product, etc.) detect mat karo. Text jaisa user ne bola hai, waisa ka waisa backend ko bhej do.
2. **NO Local Database / Storage:** App local storage (AsyncStorage, SQLite, Hive) me conversation history mat save karo. Backend khud server-side MongoDB me har session state save kar raha hai.
3. **NO Extra UI Clutter:** App me koi complex wizard ya custom forms mat banao. User sirf mic press karega ya bolega, aur backend aage ka step khud handle karega.
4. **NO Hardcoded Audio Prompts:** App me koi custom hardcoded audio/sound play mat karo. Backend response me jo **`promptMessage`** aayega, SIRF ussi ko Text-To-Speech (TTS) me bolna hai.

---

## ✅ Strict DOs (App Me SIRF Yeh 2 Kaam Karne Hain)

1. **Speech-To-Text (STT):** User microphone me bolega ➔ App voice ko Text (String) me convert karega ➔ Backend `POST /api/v1/voice/process` ko bhejega.
2. **Text-To-Speech (TTS) + Auto-Listen:** Backend response ka `promptMessage` TTS dwara sunayein ➔ **Audio khatam hote hi AUTOMATICALLY mic ON kar dein (agar `isCompleted === false`)!**

---

## 📡 API Specification

- **Endpoint:** `POST /api/v1/voice/process`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <USER_JWT_TOKEN>
  ```
- **Request Body:**
  ```json
  {
    "text": "Ram Traders ko 100 quintal chana 5000 rate se becho",
    "sessionId": "VS-1724666400000-abcd1234"
  }
  ```
- **Response Body:**
  ```json
  {
    "status": 200,
    "data": {
      "sessionId": "VS-1724666400000-abcd1234",
      "step": "COLLECTING_DETAILS",
      "isCompleted": false,
      "isInterrupted": false,
      "promptMessage": "Rate kya hai?",
      "draftData": {
        "buyerName": "Ram Traders",
        "productName": "Chana",
        "quantity": 100
      }
    }
  }
  ```

---

## 🧠 Session Management (The Only Variable in App Memory)

App memory/state me **SIRF 1 String Variable** maintain karna hai:

```javascript
let activeSessionId = null; // Default value is null
```

### Session ID Lifecycle Rules:
1. **First Turn (Naya task):** Backend ko `"sessionId": null` bhejo.
2. **Save ID:** Response me jo `data.sessionId` aaye, use `activeSessionId` me save kar lo.
3. **Subsequent Turns (Baat aage badhne par):** Agli har request me wahi `activeSessionId` bhejo.
4. **Reset ID:** Jab response me `data.isCompleted === true` ya `data.step === "COMPLETED"` ya `"CANCELLED"` aaye, tab `activeSessionId = null` kar do.

---

## 💻 25-Line Production Code Example (Flutter / React Native / JS)

```javascript
// 1. Session & Voice State (App Memory)
let activeSessionId = null;
let isSessionActive = false;

/**
 * Step 1: Send Spoken Text to Pravisti Backend API
 */
async function sendVoiceToBackend(userSpokenText) {
  try {
    const response = await fetch("https://your-domain.com/api/v1/voice/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userAuthToken}`
      },
      body: JSON.stringify({
        text: userSpokenText,
        sessionId: activeSessionId // Sends null on start, previous ID on follow-up
      })
    });

    const result = await response.json();
    const data = result.data;

    // Save Session ID
    if (data && data.sessionId) {
      activeSessionId = data.sessionId;
    }

    // Check if session completed or cancelled
    const sessionFinished = data && (data.isCompleted || data.step === "COMPLETED" || data.step === "CANCELLED");
    if (sessionFinished) {
      activeSessionId = null;
      isSessionActive = false;
    } else {
      isSessionActive = true;
    }

    // Play AI Prompt Message and setup Auto-Mic Trigger
    if (data && data.promptMessage) {
      playTTSWithAutoListen(data.promptMessage, !sessionFinished);
    }

    // Optional: Live UI Draft Preview
    if (data && data.draftData) {
      updateLiveDraftCard(data.draftData);
    }
  } catch (error) {
    console.error("Voice API Error:", error);
    playTTSWithAutoListen("Kripya dobara koshish karein.", false);
  }
}

/**
 * Step 2: Play Text-To-Speech Audio AND Auto-Start Mic when Audio Finishes!
 */
function playTTSWithAutoListen(promptMessage, shouldListenNext) {
  STT.stopListening(); // Stop mic while speaking
  
  TTS.speak(promptMessage, {
    onDone: () => {
      // CRITICAL HANDS-FREE STEP:
      // Jab TTS bolna khatam kare, tab AGAR task finish nahi hua hai, TO AUTOMATICALLY MIC START KARO!
      if (shouldListenNext && isSessionActive) {
        startAutoListening();
      }
    },
    onError: (err) => console.error("TTS Error", err)
  });
}

/**
 * Step 3: Auto Start STT Listener
 */
function startAutoListening() {
  STT.startListening({
    onResult: (spokenText) => {
      sendVoiceToBackend(spokenText);
    }
  });
}
```

---

## 🔄 Complete Siri Experience Lifecycle

```
[User Mic] ➔ "Monu company me deal create karo"
│
▼ (App sends: text="Monu company...", sessionId=null)
[Backend Server] ➔ Response: sessionId="VS-101", promptMessage="Deal me kaunsa product aur quantity add karni hai?"
│
▼ (App TTS speaks: "Deal me kaunsa product...")
[TTS Finishes ➔ onDone Event Triggered ➔ App Mic Automatically ON]
│
▼ (User answers directly without touching screen)
[User Mic] ➔ "Basmati rice 50 bag rate 3000"
│
▼ (App sends: text="Basmati rice...", sessionId="VS-101")
[Backend Server] ➔ Response: sessionId="VS-101", promptMessage="Aapki deal create ho gayi hai!", isCompleted=true
│
▼ (App TTS speaks: "Aapki deal create...", activeSessionId resets to null)
```
