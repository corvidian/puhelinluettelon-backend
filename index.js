require("dotenv").config();
const Person = require("./models/person");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(express.static("build"));
app.use(cors());

morgan.token("body", (req, res) => {
  // Log - if there's no body and {} if there's an empty body
  if (req.get("Content-Length")) {
    return JSON.stringify(req.body);
  }
  return null;
});
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms :body")
);

app.get("/", (req, res) => {
  res.send('<p>People are at <a href="/api/persons">/api/persons</a> </p>');
});

app.get("/info", (req, res, next) => {
  Person.estimatedDocumentCount()
    .then((personCount) => {
      res.send(
        `<p>Phonebook has info for ${personCount} people</p>
<p>${new Date()}</p>`
      );
    })
    .catch((error) => next(error));
});

app.get("/api/persons", (request, response, next) => {
  Person.find({})
    .then((persons) => {
      response.json(persons);
    })
    .catch((error) => next(error));
});

app.get("/api/persons/:id", (request, response, next) => {
  Person.findById(request.params.id)
    .then((person) => {
      if (person) {
        response.json(person);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

app.delete("/api/persons/:id", (request, response, next) => {
  Person.findByIdAndRemove(request.params.id)
    .then((result) => {
      response.status(204).end();
    })
    .catch((error) => next(error));
});

app.post("/api/persons", (request, response, next) => {
  const body = request.body;

  const personError = validatePerson(body);
  if (personError) {
    return response.status(400).json({ error: personError });
  }

  const person = new Person(parsePerson(body));

  person
    .save()
    .then((savedPerson) => response.json(savedPerson))
    .catch((error) => next(error));
});

app.put("/api/persons/:id", (request, response, next) => {
  const { name, number } = request.body;

  const personError = validatePerson({name, number});
  if (personError) {
    return response.status(400).json({ error: personError });
  }

  Person.findByIdAndUpdate(
    request.params.id,
    { name, number },
    { new: true, runValidators: true, context: "query" }
  )
    .then((updatedPerson) => {
      if (updatedPerson) {
        response.json(updatedPerson);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

const validatePerson = (body) => {
  if (!body.number) {
    return "number missing";
  }
  return null;
};

const parsePerson = (body) => {
  return {
    name: body.name,
    number: body.number,
  };
};

const errorHandler = (error, request, response, next) => {
  console.error(error.message);

  if (error.name === "CastError") {
    return response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  }

  next(error);
};

app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
