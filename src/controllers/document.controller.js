let fs = require('fs');
let path = require('path');
let PDFDocument = require('pdfkit');
let UserDocument = require('../models/UserDocument.model');
let Template = require('../models/Template.model');
let bus = require('../events/index');
let config = require('../config/index');

async function uploadFile(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let doc = await UserDocument.create({
      userId: req.user.id,
      templateId: null,
      filledData: {},
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      encrypted: false
    });

    bus.emit('document.uploaded', { userId: req.user.id, docId: doc._id });

    res.status(201).json({ document: doc });
  } catch (err) {
    next(err);
  }
}

async function generatePdf(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    let { templateId, fields = {}, save = false, filename } = req.body || {};
    let template = null;

    if (templateId) {
      template = await Template.findById(templateId).lean();
      if (!template) return res.status(404).json({ message: 'Template not found' });
    }

    let title = template ? template.title : (fields.title || 'Document');
    let outName = filename ? filename.replace(/\s+/g, '_') : `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    let outPath = path.join(config.UPLOAD_DIR, outName);

    if (save) {
      let writeStream = fs.createWriteStream(outPath);
      let doc = new PDFDocument({ margin: 50 });
      doc.pipe(writeStream);

      doc.fontSize(18).text(title, { align: 'center' }).moveDown(1);

      if (template && template.templateBody) {
        let body = template.templateBody;
        for (let [k, v] of Object.entries(fields)) {
          let re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
          body = body.replace(re, String(v));
        }
        doc.fontSize(12).text(body, { align: 'left' });
      } else {
        for (let [k, v] of Object.entries(fields)) {
          doc.fontSize(12).text(`${k}: ${v}`).moveDown(0.3);
        }
      }

      doc.moveDown(2).fontSize(10).text(`Generated on ${new Date().toLocaleString()}`, { align: 'right' });
      doc.end();

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      let stats = fs.statSync(outPath);
      let saved = await UserDocument.create({
        userId: req.user.id,
        templateId: templateId || null,
        filledData: fields,
        filename: outName,
        originalName: outName,
        mimetype: 'application/pdf',
        size: stats.size,
        path: outPath,
        encrypted: false
      });

      bus.emit('document.created', { userId: req.user.id, docId: saved._id });

      res.status(201).json({ document: saved });
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${outName}"`);

      let doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      doc.fontSize(18).text(title, { align: 'center' }).moveDown(1);

      if (template && template.templateBody) {
        let body = template.templateBody;
        for (let [k, v] of Object.entries(fields)) {
          let re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
          body = body.replace(re, String(v));
        }
        doc.fontSize(12).text(body, { align: 'left' });
      } else {
        for (let [k, v] of Object.entries(fields)) {
          doc.fontSize(12).text(`${k}: ${v}`).moveDown(0.3);
        }
      }

      doc.moveDown(2).fontSize(10).text(`Generated on ${new Date().toLocaleString()}`, { align: 'right' });
      doc.end();
    }
  } catch (err) {
    next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    let docs = await UserDocument.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ documents: docs });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFile, generatePdf, listDocuments };
