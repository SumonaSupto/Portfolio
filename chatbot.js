function toggleChatbot() {
    document.body.classList.toggle('show-chatbot');
    if (!document.body.classList.contains('show-chatbot')) {
        window.speechSynthesis.cancel();
    }
}

document.getElementById('chat-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const userInput = document.getElementById('user-input');
    const messageText = userInput.value.trim();

    if (!messageText) return;

    addMessage(messageText, 'user-message');
    userInput.value = '';
    
    try {
        const firebaseUrl = `https://web-project-e08b7-default-rtdb.firebaseio.com/api_data/${encodeURIComponent(messageText)}.json`;

        // Check Firebase database for existing response
        const firebaseResponse = await fetch(firebaseUrl);
        const firebaseData = await firebaseResponse.json();

        if (firebaseData && firebaseData.answer) {
            // If a response exists in Firebase, use it directly
            const botReply = firebaseData.answer;
            console.log("Fetched from Firebase:", botReply); 
            addMessage(botReply, 'bot-message');
            speak(botReply);
        } else {
            // No response in Firebase, so call the API
            const apiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyDjMeNbLxjfyfht8q7QVv1P9M4ezUvL0bg", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: messageText }] }]
                })
            });

            if (!apiResponse.ok) throw new Error(`API Error: ${apiResponse.status} ${apiResponse.statusText}`);

            const data = await apiResponse.json();
            let botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (botReply) {
                botReply = botReply.replace(/[*#]/g, "");
                // Limit bot response to 5-6 lines for clarity
                botReply = botReply.length > 500 ? botReply.substring(0, 500) + '...' : botReply;
                addMessage(botReply, 'bot-message');
                speak(botReply);

                // Save the API response to Firebase
                await fetch(firebaseUrl, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ answer: botReply })
                });
            } else {
                const errorMessage = "Sorry, I couldn't understand that. (Unexpected response structure)";
                addMessage(errorMessage, 'bot-message');
                speak(errorMessage);
            }
        }
    } catch (error) {
        console.error("Error:", error);
        const errorMessage = "Error: Unable to contact the API or process the response.";
        addMessage(errorMessage, 'bot-message');
        speak(errorMessage);
    }
});


function addMessage(text, className) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${className}`;
    
    messageDiv.textContent = text.length > 500 ? text.substring(0, 500) + '...' : text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Voice input function with enhanced handling
function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Speech recognition not supported in this browser.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('user-input').value = transcript;
        document.getElementById('chat-form').dispatchEvent(new Event('submit'));
    };

    recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    recognition.start();
}

// Voice output function with immediate cancel of previous speech
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;
        
        utterance.onend = () => {
            if (!document.body.classList.contains('show-chatbot')) {
                window.speechSynthesis.cancel();
            }
        };

        window.speechSynthesis.speak(utterance);
    } else {
        console.warn("Speech synthesis not supported in this browser.");
    }
}
