// Copyright 2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

function Answer(options, score) {
  this.options = options;
  this.score = score;

}
function Question(question, answers) {
  this.question = question;
  this.answers = answers;
}

process.env.DEBUG = 'actions-on-google:*';
const functions = require('firebase-functions');
const App = require('actions-on-google').ApiAiApp;

const CONGRATULATIONS_ANSWER = "Congratulations! You know the Technology Mindset like Sergii Smirnov.";
const WRONG_ANSWER = "Wrong answer. Please, study Technology Mindset and try again.";

const ALL_QUESTIONS = [
  new Question("Team is the … in Technology. It’s us, not me.", [
    new Answer(["core functional unit", "core unit"], 10)
  ]),
  new Question("Team is … We do not wait for someone to come and tell us what to do.", [
    new Answer(["proactive and self-organized", "core unit"], 10),
    new Answer(["proactive", "self-organized"], 5)
  ]),
  new Question("Team is … Team plans and commits to result. Team is accountable for the result. External factors are NOT an excuse, they are a challenge to overcome.", [
    new Answer(["responsible"], 10)
  ]),
  new Question("Teams are ... to itself, other teams, to heads and to the whole organization.", [
    new Answer(["open and sincere", "core unit"], 10),
    new Answer(["open", "sincere"], 5)
  ]),
  new Question("Teams raise … without delays. Notify once you realize you can’t satisfy milestone or agreement with other team or person. Escalate if your agreement isn’t satisfied.", [
    new Answer(["red flags"], 10),
    new Answer(["flags"], 5)
  ]),
  new Question("Teams are ... Teams ensure clarity on the Receiving End. If you expect something from other team/person, ensure team/person knows about this and understands what exactly should be done.", [
    new Answer(["explicit"], 10)
  ]),
  new Question("Teams treat an incident or a problem as … until we clearly understand its reasons and impact.", [
    new Answer(["critical"], 10)
  ]),
];

const ASK_CONTEXT = "ask";

const ANSWERED_QUESTIONS = "answered_questions";
const CURRENT_QUESTION = "current_question";
const ANSWERS = "answers";

const ANSWER_ARGUMENT = "answer";

const DEFAULT_TIMEOUT = 10;
const FINISHED_FLAG = "finished";

exports.yourAction = functions.https.onRequest((request, response) => {
  const app = new App({ request, response });

  console.log('Request headers: ' + JSON.stringify(request.headers));
  console.log('Request body: ' + JSON.stringify(request.body));

  function handleAsk(app, incrementQuestion) {

    let params = getParameters(app, ASK_CONTEXT);

    let currentQuestion = params[CURRENT_QUESTION];
    if (currentQuestion == null)
      currentQuestion = 0;
    else if (incrementQuestion)
      currentQuestion = currentQuestion + 1;

    params[CURRENT_QUESTION] = currentQuestion;
    app.setContext(ASK_CONTEXT, DEFAULT_TIMEOUT, params);

    if (currentQuestion >= ALL_QUESTIONS.length) {
      app.setContext(ASK_CONTEXT, 0);
      if (params.score < (ALL_QUESTIONS.length * 10) / 2)
        app.tell(WRONG_ANSWER);
      else
        app.tell(CONGRATULATIONS_ANSWER);
      return;
    }
    let question = ALL_QUESTIONS[currentQuestion];
    let questionText = "Question " + (currentQuestion + 1) + ". " + question.question;

    /*
    const card = app.buildBasicCard(questionText)
    .setImage("https://pbs.twimg.com/profile_images/496317028408365060/sSwMqqsH.png", "name")
    .addButton("http://google.com", "button");
*/
    const richResponse = app.buildRichResponse()
    //.addBasicCard(card)
    .addSimpleResponse(questionText)
    .addSuggestions(["one", "two", "three"]);

    app.ask(richResponse, "lol");
  }

  function handleAnswer(app) {
    let askContext = app.getContext(ASK_CONTEXT);
    if (askContext == null) {
      handleAsk(app);
      return;
    }

    let answer = app.getArgument(ANSWER_ARGUMENT);
    if (answer == null) {
      answer = app.getRawInput();
    }

    let askParameters = getParameters(app, ASK_CONTEXT);
    let questionIndex = askParameters[CURRENT_QUESTION];
    console.log(questionIndex);
    let question = ALL_QUESTIONS[questionIndex];
    console.log(question);
    let answers = question.answers;
    let matched = false;
    console.log(answer);
    for (let answerIndex in answers) {
      let options = answers[answerIndex].options;
      let score = answers[answerIndex].score;
      for (let optionIndex in options) {
        let option = options[optionIndex];

        if (option == answer.toLowerCase().trim()) {
          let params = getParameters(app, ASK_CONTEXT);
          params.score = params.score + score;
          app.setContext(ASK_CONTEXT, DEFAULT_TIMEOUT, params);
          matched = true;
          handleAsk(app, true);
        }
      }

    }
    /*
    if (!matched) {
      app.setContext(ASK_CONTEXT, 0);
      app.tell(WRONG_ANSWER);
    }
    */
    handleAsk(app, true);
  }

  function handleUnknown(app) {

    let askContext = app.getContext(ASK_CONTEXT);
    if (askContext != null) {
      handleAnswer(app);
      return;
    }
    app.tell("I missed what you said. I have quiz for you. Type 'quiz' to start it");

  }

  function handleReset(app) {
    let params = getParameters(app, ASK_CONTEXT);

    app.setContext(ASK_CONTEXT, 0);
    app.tell("Your score is: " + params.score);
  }

  function getParameters(app, contextName) {
    let context = app.getContext(contextName);
    let params = { score: 0 };
    if (context && context.parameters)
      params = context.parameters;

    return params;
  }

  const actionMap = new Map();
  actionMap.set('question.ask', handleAnswer);
  actionMap.set('input.unknown', handleUnknown);
  actionMap.set('question.reset', handleReset);

  app.handleRequest(actionMap);
});
// [END YourAction]