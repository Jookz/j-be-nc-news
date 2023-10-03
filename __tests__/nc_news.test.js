const request = require('supertest');
const app = require("../app.js");
const db = require('../db/connection.js');
const data = require('../db/data/test-data/index.js');
const seed = require('../db/seeds/seed.js');

beforeEach(() => {
	return seed(data);
});

afterAll(() => {
	db.end();
});

describe('GET /api', () => {
    it('GET:404 should check error is returned when given invalid path', () => {
		return request(app)
			.get('/api/HELLO')
			.expect(404)
			.then(({body}) => {
				expect(body.msg).toBe('Path not found');
			});
    });
});

describe('GET /api/topics', () => {
    it('GET:200 should return status code 200', () => {
        return request(app).get('/api/topics').expect(200);
    });
    it('GET:200 should provide all topics from table in correct format', () => {
        return request(app).get('/api/topics').then(({body}) =>{
            const topics = body.topics;
            expect(topics).toHaveLength(3);
            topics.forEach((topic) => {
                expect(typeof topic.description).toBe('string');
                expect(typeof topic.slug).toBe('string');
            });
        })
    });
    
});

describe('GET /api/articles/:article_id', () => {
    it('GET:200 should return status code 200', () => {
        return request(app).get('/api/articles/1').expect(200);
    });
    it('GET:200 should provide the article by its ID', () => {
        return request(app).get('/api/articles/1').then(({body}) => {
            const testArticle = {
                article_id: 1,
                title: "Living in the shadow of a great man",
                topic: "mitch",
                author: "butter_bridge",
                body: "I find this existence challenging",
                created_at: "2020-07-09T20:11:00.000Z",
                votes: 100,
                article_img_url:
                  "https://images.pexels.com/photos/158651/news-newsletter-newspaper-information-158651.jpeg?w=700&h=700",
              } 
            expect(body.article).toMatchObject(testArticle);
        })
    });
    it('GET:404 should return error if article ID does not exist', () => {
        return request(app)
			.get('/api/articles/9999')
			.expect(404)
			.then((response) => {
				expect(response.body.msg).toBe('Article ID not found');
			});
    });
    it.only('GET:400 should return error if given invalid article ID', () => {
        return request(app)
			.get('/api/articles/hamsandwich')
			.expect(400)
			.then((response) => {
				expect(response.body.msg).toBe('Bad request');
			});
    });
});