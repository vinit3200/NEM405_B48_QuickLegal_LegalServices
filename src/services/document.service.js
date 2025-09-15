let fs = require('fs');
let path = require('path');
let PDFDocument = require('pdfkit');
let Template = require('../models/Template.model');
let UserDocument = require('../models/UserDocument.model');
let config = require('../config/index');
let bus = require('../events/index');

async function generateAndMaybeSave({ templateId = null, fields = {}, save = false, filename = null }, outStream = null) {
  let template = templateId ? await Template.findById(templateId).lean() : null;
  let title = template ? template.title : (fields.title || 'Document');
  let outName = filename ? filename.replace(/\s+/g, '_') : `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  let uploadDir = config.UPLOAD_DIR;

  if (save) {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    let outPath = path.join(uploadDir, outName);
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
      userId: fields._userId || null,
      templateId: templateId || null,
      filledData: fields,
      filename: outName,
      originalName: outName,
      mimetype: 'application/pdf',
      size: stats.size,
      path: outPath,
      encrypted: false
    });

    bus.emit('document.created', { userId: fields._userId || null, docId: saved._id });
    return saved;
  } else {
    if (!outStream) throw new Error('outStream is required when save=false');
    let doc = new PDFDocument({ margin: 50 });
    doc.pipe(outStream);

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
    return null;
  }
}

module.exports = { generateAndMaybeSave };
