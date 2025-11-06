const db = require('../config/database');

class Talk {
  constructor(data) {
    this.id = data.id;
    this.firstName = data.first_name || data.firstName;
    this.lastName = data.last_name || data.lastName;
    this.email = data.email;
    this.sendCopy = data.send_copy || data.sendCopy || false;
    this.talkTitle = data.talk_title || data.talkTitle;
    this.talkAbstract = data.talk_abstract || data.talkAbstract;
    this.affiliation = data.affiliation;
    this.questions = data.questions;
    this.submittedAt = data.submitted_at || data.submittedAt || new Date();
  }

  // Create a new talk submission
  static async create(data) {
    const submissionData = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      send_copy: data.sendCopy || false,
      talk_title: data.talkTitle,
      talk_abstract: data.talkAbstract,
      affiliation: data.affiliation,
      questions: data.questions
    };

    const result = await db.insertTalkSubmission(submissionData);
    return new Talk(result);
  }

  // Get all talk submissions
  static async findAll() {
    const submissions = await db.getAllTalkSubmissions();
    return submissions.map(data => new Talk(data));
  }

  // Get a talk submission by ID
  static async findById(id) {
    const data = await db.getTalkSubmissionById(id);
    return data ? new Talk(data) : null;
  }

  // Delete a talk submission
  static async delete(id) {
    return await db.deleteTalkSubmission(id);
  }

  // Convert to plain object for JSON serialization
  toJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      sendCopy: this.sendCopy,
      talkTitle: this.talkTitle,
      talkAbstract: this.talkAbstract,
      affiliation: this.affiliation,
      questions: this.questions,
      submittedAt: this.submittedAt
    };
  }

  // Get formatted submission date
  getFormattedDate() {
    return new Date(this.submittedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get full name
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

module.exports = Talk;
