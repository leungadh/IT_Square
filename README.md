# AI-Assisted Content Editing & Delivery Platform

![Architecture Diagram](IT_Square.png)

---

## 1. What is this project about?
This project is an **AI-powered content processing and publishing platform** designed to help media companies and enterprises deliver multilingual news and event updates **faster, smarter, and more securely** using **AWS infrastructure**.

---

## 2. What problem are we trying to solve?
Media teams in Hong Kong face:
- **Fragmented, multilingual sources**: Editors receive press releases and event invites in Traditional Chinese, Simplified Chinese, and English—often as unstructured emails or images.
- **Limited resources vs. high content volume**: Small editorial teams struggle to localize, fact-check, classify, and publish quickly in a fast-moving tech ecosystem.
- **Legacy CMS overhead**: Systems like WordPress create security risks, require heavy maintenance, and slow down content delivery.
- **Demand for real-time relevance**: Readers expect up-to-date, mobile-first content and event listings, but current workflows can’t keep up.

### 2.1 Who is our target user?
- Media companies  
- Enterprise communication teams  
- Event organizers  

### 2.2 What is the benefit of using this program?
- **Faster publishing**: From hours to minutes  
- **Lower operational costs**  
- **Personalized, validated content** for readers  
- **Secure and scalable architecture** powered by AWS  

---

## 3. Our Solution and Approach
We built an **AI-assisted workflow** integrated with AWS services:

1. **Sanitization**: AI/LLM cleans and normalizes multilingual content.  
2. **Classification & Tagging**: Articles categorized and enriched with metadata.  
3. **Storage & Indexing**: Uploaded to **Amazon S3**, indexed via **AWS Lambda**.  
4. **Frontend Delivery**: **Next.js + AWS AppSync** for mobile-first UI.  
5. **Personalization**: **Amazon Personalize** tailors content to user behavior.  
6. **Validation**: **LangChain + Amazon Q** verify geospatial data using HK Gov APIs.  

---

## 4. AWS Technologies Used

![Workflow Diagram](workflow%20diagram.jpeg)

- **Amazon S3** – Content storage with lifecycle policies  
- **AWS Lambda** – Event-driven indexing and validation  
- **AWS AppSync** – GraphQL APIs for efficient data fetching  
- **Amazon DynamoDB** – User behavior analytics and metadata  
- **Amazon Personalize** – Personalized content recommendations  
- **Amazon CloudFront** – Global CDN for fast content delivery  
- **AWS Amplify** – CI/CD and hosting for frontend  
- **Amazon Q + LangChain** – AI-powered validation and automation  
- **Route 53** – DNS with geolocation routing  

---

## 5. Future Enhancements
- **Advanced AI/LLM fine-tuning** for better multilingual accuracy  
- **Automated translation & localization**  
- **Deeper personalization** using predictive analytics  
- **Fact-checking & compliance automation**  
- **Integration with social media and enterprise tools**  
- **Enhanced UI/UX dashboards for editors**  

## 6. Demo Site
- [Try this demo site: it-square.hk](https://it-square.hk)
