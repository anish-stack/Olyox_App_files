const AWS = require('aws-sdk');
const fs = require('fs');


const s3 = new AWS.S3();
const isValidFile = (filePath) => {
    const validFileTypes = ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.pdf', 'webp'];
    const extname = path.extname(filePath).toLowerCase();
    return validFileTypes.includes(extname);
};
const uploadFile = async (filePath, bucketName, key) => {
    try {
        if (!isValidFile(filePath)) {
            throw new Error('Invalid file format. Only jpeg, jpg, png, gif, bmp, and pdf are allowed.');
        }

        // Read the file
        const fileContent = fs.readFileSync(filePath);

        // S3 upload parameters
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: fileContent,
        };

        const fileExtension = path.extname(filePath).toLowerCase();
        if (['.jpeg', '.jpg'].includes(fileExtension)) {
            params.ContentType = 'image/jpeg';
        } else if (fileExtension === '.png') {
            params.ContentType = 'image/png';
        } else if (fileExtension === '.gif') {
            params.ContentType = 'image/gif';
        } else if (fileExtension === '.bmp') {
            params.ContentType = 'image/bmp';
        } else if (fileExtension === '.pdf') {
            params.ContentType = 'application/pdf';
        }

        const result = await s3.upload(params).promise();

        return result.Location;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error; // Re-throw the error to be handled by the caller
    }
};


module.exports = uploadFile
