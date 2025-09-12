# Dataset Setup Guide

## 📥 Download the Dataset

The Prompt Battle WebGame requires a dataset of images and prompts to function. Follow these steps to set it up:

### 1. Download from Kaggle

1. Visit the [Kaggle dataset page](https://www.kaggle.com/datasets/rturley/stable-diffusion-100k-custom-prompts-and-images/data)
2. Click "Download" to get the dataset files
3. You'll need a Kaggle account (free to create)

### 2. Extract the Files

After downloading, you'll get a ZIP file. Extract it and organize the files as follows:

```
backend/dataset/
├── custom_prompts_df.csv          # The main CSV file with prompts
└── images/
    └── 0/                         # Folder containing all PNG images
        ├── custom_0_0.png
        ├── custom_1_0.png
        ├── custom_2_0.png
        └── ... (100,000+ images)
```

### 3. Verify the Setup

1. Check that `backend/dataset/custom_prompts_df.csv` exists
2. Check that `backend/dataset/images/0/` contains many PNG files
3. The CSV should have columns: `prompt,image_file`
4. Image files should be named like `custom_0_0.png`, `custom_1_0.png`, etc.

### 4. Test the Game

1. Start the server: `cd backend && node server.js`
2. Open the game: `http://localhost:3000`
3. Try the Daily Challenge - images should load properly
4. If images don't load, check the browser console for errors

## 🔧 Troubleshooting

### Images Not Loading
- Verify the file structure matches exactly
- Check that image files are actually PNG files
- Ensure the CSV file has the correct format
- Look at server console for error messages

### Server Errors
- Make sure the CSV file is readable
- Check that the images folder has proper permissions
- Verify the dataset path in the server logs

### Performance Issues
- The dataset is large (several GB)
- First load might take a moment to process
- Consider using an SSD for better performance

## 📊 Dataset Information

- **Total Images**: 100,000+
- **Format**: PNG images
- **Size**: Several GB total
- **Source**: Stable Diffusion generated images
- **Prompts**: Human-written descriptions

## 🚀 Ready to Play!

Once the dataset is set up, you can enjoy the full Prompt Battle WebGame experience with thousands of unique images and prompts!
