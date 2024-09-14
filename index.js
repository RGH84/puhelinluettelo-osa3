const express = require('express')
const app = express()
require('dotenv').config()

const Person = require('./models/person')

app.use(express.static('dist'))

const requestLogger = (request, response, next) => {
  console.log('Method:', request.method)
  console.log('Path:  ', request.path)
  console.log('Body:  ', request.body)
  console.log('---')
  next()
}

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  }

  next(error)
}

const morgan = require('morgan')
const cors = require('cors')

app.use(cors())
app.use(express.json())
app.use(requestLogger)

morgan.token('body', (req) => JSON.stringify(req.body))

app.use(morgan('tiny', {
  skip: (req) => req.method === 'POST'
}))


app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body', {
  skip: (req) => req.method !== 'POST'
}))

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}
app.get('/', (request, response) => {
  response.send('<h1>Hello! This is jk-phonebook!</h1>')
})

app.get('/info', (request, response, next) => {
  Person.countDocuments({}).then(countPersons => {
    const timeNow = new Date().toISOString()

    const info = `
      <p>Phonebook has info for ${countPersons} people</p>
      <p id="time">${timeNow}</p>
      <script>
        const utcTime = document.getElementById('time').innerText
        const localTime = new Date(utcTime).toString()
        document.getElementById('time').innerText = localTime
      </script>
    `
    response.send(info)
  })
  .catch(error => next(error))
})

app.get('/api/persons', (request, response, next) => {
  Person.find({}).then(persons => {
  response.json(persons)
  })
  .catch(error => next(error))
})

app.post('/api/persons', (request, response, next) => {
    const body = request.body

    if (!body.name || !body.number) {
      return response.status(400).json({
        error: 'name or number missing'
      })
    }

    Person.findOne({ name: body.name })
      .then(existingPerson => {
        if (existingPerson) {
          return response.status(400).json({ error: 'name must be unique' })
        }

    const person = new Person({
      name: body.name,
      number: body.number,
    })

    person.save().then(savedPerson => {
      response.json(savedPerson)
    })
    .catch(error => next(error))
  })
  .catch(error => next(error))
})

  app.get('/api/persons/:id', (request, response, next) => {
    Person.findById(request.params.id)
      .then(person => {
        if (person) {
          response.json(person)
        } else {
          response.status(404).end()
        }
      })
      .catch(error => next(error))
  })

  app.delete('/api/persons/:id', (request, response, next) => {
    Person.findByIdAndDelete(request.params.id)
      .then(result => {
        if (result) {
          response.status(204).end()
        } else {
          response.status(404).json({ error: 'person not found' })
        }
      })
      .catch(error => next(error))
  })

  app.put('/api/persons/:id', (request, response, next) => {
    const body = request.body

    const person = {
      name: body.name,
      number: body.number,
    }

    Person.findByIdAndUpdate(request.params.id, person, { new: true })
      .then(updatedPerson => {
        response.json(updatedPerson)
      })
      .catch(error => next(error))
  })

app.use(unknownEndpoint)
app.use(errorHandler)

const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
