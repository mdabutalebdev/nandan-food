import { Schema, model } from 'mongoose';

// A job application submitted from the /career page "Apply now" form.
const applicationSchema = new Schema(
    {
        jobTitle:    { type: String, default: '', trim: true, maxlength: 200 }, // which opening
        name:        { type: String, required: true, trim: true, maxlength: 120 },
        phone:       { type: String, required: true, trim: true, maxlength: 40 },
        email:       { type: String, default: '', trim: true, maxlength: 200 },
        cvUrl:       { type: String, default: '' },                              // uploaded CV (pdf/doc)
        coverLetter: { type: String, default: '', trim: true, maxlength: 5000 }, // optional
        status:      { type: String, enum: ['new', 'reviewed', 'shortlisted', 'rejected'], default: 'new' },
    },
    { timestamps: true }
);

applicationSchema.index({ status: 1, createdAt: -1 });

export const Application = model('Application', applicationSchema);
