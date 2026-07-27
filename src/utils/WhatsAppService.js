export const generateWhatsAppLink = (dealData) => {
  const { product, qty, price, parties } = dealData;
  const message = `*New Sauda Deal Alert on Pravisti*%0A%0A` +
    `*Product:* ${product}%0A` +
    `*Quantity:* ${qty}%0A` +
    `*Price:* ${price}%0A` +
    `*Parties:* ${parties}%0A%0A` +
    `Detailed breakdown is available on the Pravisti app. Click the link below to view and accept the deal:%0A` +
    `https://pravisti.app/deal/view?id=${Math.random().toString(36).substr(2, 9)}%0A%0A` +
    `_Download Pravisti:_ https://play.google.com/store/apps/details?id=com.pravisti`;

  return `whatsapp://send?text=${message}`;
};

export const shareToWhatsApp = (dealData) => {
  const url = generateWhatsAppLink(dealData);
  console.log('Opening WhatsApp with URL:', url);
  return url;
};

export const generateAssistedRegistrationLink = (inviteData) => {
  const { partyType, ownerName, companyName, brokerName, brokerCompany, mobileNumber, dealRef } = inviteData;
  const message = `*Welcome to Pravisti — Account & Deal Invitation*%0A%0A` +
    `Hello *${ownerName}*,%0A` +
    `Broker *${brokerName}* (${brokerCompany}) has created a temporary business account for *${companyName}* on Pravisti to facilitate a Sauda Deal (${dealRef || 'Deal'}).%0A%0A` +
    `*Log in to verify your business & view the deal:*%0A` +
    `1. Download Pravisti App: https://play.google.com/store/apps/details?id=com.pravisti%0A` +
    `2. Log in using your mobile number: +91 ${mobileNumber}%0A` +
    `3. Confirm ownership to activate your company & deals instantly!%0A%0A` +
    `_Pravisti — B2B Agri & Commodity Trading Platform_`;

  return `whatsapp://send?text=${message}`;
};
