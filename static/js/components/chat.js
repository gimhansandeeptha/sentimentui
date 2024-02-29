/**
 * scroll to the bottom of the chats after new message has been added to chat
 */
const converter = new showdown.Converter();
function scrollToBottomOfResults() {
  const terminalResultsDiv = document.getElementById("chats");
  terminalResultsDiv.scrollTop = terminalResultsDiv.scrollHeight;
}

// Function to add a bot response to the response box
function addBotResponseToBox(message) {
  $(".chat_responses").append('<div class="bot-message">' + message + '</div>');
}

/**
 * Set user response on the chat screen
 * @param {String} message user message
 */
function setUserResponse(message) {
  // Clear the previous messages in the chats container
  $(".chats").html("");
  $(".chat_responses").html("");
  
  // Display the user's current message
  const user_response = `<p class="userMsg">${message}</p><div class="clearfix"></div>`;
  $(user_response).appendTo(".chats").show("slow");

  $(".usrInput").val("");
  scrollToBottomOfResults();
  showBotTyping();
  $(".suggestions").remove();
}

/**
 * returns formatted bot response
 * @param {String} text bot message response's text
 *
 */
function getBotResponse(text) {
  botResponse = `<span class="botMsg">${text}</span><div class="clearfix"></div>`;
  return botResponse;
}

/**
 * renders bot response on to the chat screen
 * @param {Array} response json array containing different types of bot response
 *
 * for more info: `https://rasa.com/docs/rasa/connectors/your-own-website#request-and-response-format`
 */
function setBotResponse(response) {
  // renders bot response after 500 milliseconds
  setTimeout(() => {
    hideBotTyping();
    if (response.prediction.length < 1) {
      // if there is no response from Rasa, send  fallback message to the user
      const fallbackMsg = "Sorry! You cannot connect to our server computer at this time. Please activate the reboot button.";

      const BotResponse = `<p class="botMsg">${fallbackMsg}</p><div class="clearfix"></div>`;

      // $(BotResponse).appendTo(".chats").hide().fadeIn(1000);  // commented 
      addBotResponseToBox(BotResponse); // added
      scrollToBottomOfResults();
    } else {
      // if we get response from Rasa
      for (let i = 0; i < response.prediction.length; i += 1) {    
        if (Array.isArray(response.prediction)) {
          const prediction = response.prediction[0]; // Assuming a 2D array

          let emoji;
          if (prediction.toLowerCase().includes("negative")) {
            emoji = "😡"; // Angry emoji
          } else if (prediction.toLowerCase().includes("neutral")) {
            emoji = "😐"; // Neutral emoji
          } else if (prediction.toLowerCase().includes("positive")) {
            emoji = "😊"; // Positive emoji
          } else {
            emoji = "💥"; // Error emoji
  }
          const botResponse = getBotResponse(`${prediction} ${emoji} `);
          // append the bot response on to the chat screen
          // $(botResponse).appendTo(".chats").hide().fadeIn(1000); // commented
          addBotResponseToBox(botResponse); // added
        }
      }
      scrollToBottomOfResults();
    }
    $(".usrInput").focus();
  }, 500);
}

/**
 * sends the user message to the rasa server,
 * @param {String} message user message
 */
async function send(message) {
  await new Promise((r) => setTimeout(r, 2000));
  $.ajax({
    url: rasa_server_url,
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({ message, sender: sender_id }),
    success(botResponse, status) {
      console.log("Response from Rasa: ", botResponse, "\nStatus: ", status);

      // if user wants to restart the chat and clear the existing chat contents
      if (message.toLowerCase() === "/restart") {
        $("#userInput").prop("disabled", false);

        // if you want the bot to start the conversation after restart
        // customActionTrigger();
        return;
      }
      setBotResponse(botResponse);
    },
    error(xhr, textStatus) {
      if (message.toLowerCase() === "/restart") {
        $("#userInput").prop("disabled", false);
        // if you want the bot to start the conversation after the restart action.
        // actionTrigger();
        // return;
      }

      // if there is no response from rasa server, set error bot response
      setBotResponse("");
      console.log("Error from bot end: ", textStatus);
    },
  });
}
/**
 * sends an event to the bot,
 *  so that bot can start the conversation by greeting the user
 *
 * `Note: this method will only work in Rasa 1.x`
 */
// eslint-disable-next-line no-unused-vars
function actionTrigger() {
  $.ajax({
    url: `http://127.0.0.1:8000/send_message/1`,// `http://localhost:5005/conversations/${sender_id}/execute`,
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      name: action_name,
      policy: "MappingPolicy",
      confidence: "0.98",
    }),
    success(botResponse, status) {
      console.log("Response from Rasa: ", botResponse, "\nStatus: ", status);

      if (Object.hasOwnProperty.call(botResponse, "messages")) {
        setBotResponse(botResponse.messages);
      }
      $("#userInput").prop("disabled", false);
    },
    error(xhr, textStatus) {
      // if there is no response from rasa server
      setBotResponse("");
      console.log("Error from bot end: ", textStatus);
      $("#userInput").prop("disabled", false);
    },
  });
}

/**
 * sends an event to the custom action server,
 *  so that bot can start the conversation by greeting the user
 *
 * Make sure you run action server using the command
 * `rasa run actions --cors "*"`
 *
 * `Note: this method will only work in Rasa 2.x`
 */
// eslint-disable-next-line no-unused-vars
function customActionTrigger() {
  $.ajax({
    url: "http://127.0.0.1:8000/send_message/1", //"http://localhost:8080/user/chat", 
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      next_action: action_name,
      tracker: {
        sender_id,
      },
    }),
    success(botResponse, status) {
      console.log("Response from Rasa: ", botResponse, "\nStatus: ", status);

      if (Object.hasOwnProperty.call(botResponse, "responses")) {
        setBotResponse(botResponse.responses);
      }
      $("#userInput").prop("disabled", false);
    },
    error(xhr, textStatus) {
      // if there is no response from rasa server
      setBotResponse("");
      console.log("Error from bot end: ", textStatus);
      $("#userInput").prop("disabled", false);
    },
  });
}

/**
 * clears the conversation from the chat screen
 * & sends the `/resart` event to the Rasa server
 */
function restartConversation() {
  $("#userInput").prop("disabled", true);
  // destroy the existing chart
  $(".collapsible").remove();

  if (typeof chatChart !== "undefined") {
    chatChart.destroy();
  }

  $(".chart-container").remove();
  if (typeof modalChart !== "undefined") {
    modalChart.destroy();
  }
  $(".chats").html("");
  $(".usrInput").val("");
  send("/restart");
}
// triggers restartConversation function.
$("#restart").click(() => {
  restartConversation();
});

/**
 * if user hits enter or send button
 * */
$(".usrInput").on("keyup keypress", (e) => {
  const keyCode = e.keyCode || e.which;

  const text = $(".usrInput").val();
  if (keyCode === 13) {
    if (text === "" || $.trim(text) === "") {
      e.preventDefault();
      return false;
    }

    $("#paginated_cards").remove();
    $(".suggestions").remove();
    $(".quickReplies").remove();
    $(".usrInput").blur();
    setUserResponse(text);
    send(text);
    e.preventDefault();
    return false;
  }
  return true;
});

$("#sendButton").on("click", (e) => {
  const text = $(".usrInput").val();
  if (text === "" || $.trim(text) === "") {
    e.preventDefault();
    return false;
  }
  // destroy the existing chart
  if (typeof chatChart !== "undefined") {
    chatChart.destroy();
  }

  $(".chart-container").remove();
  if (typeof modalChart !== "undefined") {
    modalChart.destroy();
  }

  $(".suggestions").remove();
  $("#paginated_cards").remove();
  $(".quickReplies").remove();
  $(".usrInput").blur();
  $(".dropDownMsg").remove();
  setUserResponse(text);
  send(text);
  e.preventDefault();
  return false;
});
