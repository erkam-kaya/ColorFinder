import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdOptions } from '@capacitor-community/admob';
import { NativePurchases } from '@capgo/native-purchases';

// --- ADMOB CONFIGURATION ---
// IMPORTANT: Replace with your actual Ad Unit IDs before publishing to Play Store
const bannerAdUnitId = 'ca-app-pub-3940256099942544/6300978111'; // Test Banner ID
const interstitialAdUnitId = 'ca-app-pub-3940256099942544/1033173712'; // Test Interstitial ID

// --- IN-APP PURCHASES CONFIGURATION ---
// The Product ID configured in Google Play Console
export const REMOVE_ADS_PRODUCT_ID = 'remove_ads';

let isPremiumUser = false;
let adsInitialized = false;

export const initializeMonetization = async () => {
  try {
    // 1. Check for existing purchases via Native Google Play Billing
    try {
      const { customerInfo } = await NativePurchases.restorePurchases();
      // Look through active entitlements or purchased non-consumables
      if (customerInfo && customerInfo.entitlements && customerInfo.entitlements.active) {
        // capgo/native-purchases usually returns structure similar to revenuecat if wrapped, 
        // but let's safely check the active purchases array instead.
      }
      
      // Let's check owned non-consumables if customerInfo doesn't directly give it:
      // Note: Capgo NativePurchases API: restorePurchases returns `{ customerInfo: CustomerInfo }` 
      // where CustomerInfo has `activeSubscriptions` and `nonSubscriptionTransactions`.
      if (customerInfo && customerInfo.nonSubscriptionTransactions) {
        const hasRemovedAds = customerInfo.nonSubscriptionTransactions.some(
          (t: any) => t.productIdentifier === REMOVE_ADS_PRODUCT_ID
        );
        if (hasRemovedAds) {
          isPremiumUser = true;
        }
      }
    } catch (e) {
      console.warn('NativePurchases restore failed (this is normal if not logged in or in web):', e);
    }

    // 2. Initialize AdMob (only if not premium)
    if (!isPremiumUser) {
      await AdMob.initialize({
        requestTrackingAuthorization: true,
        initializeForTesting: true, // Remove for production
      });
      adsInitialized = true;
    }
  } catch (error) {
    console.error('Monetization Init Error:', error);
  }
};

export const checkIsPremium = () => isPremiumUser;

export const showBannerAd = async () => {
  if (isPremiumUser || !adsInitialized) return;
  const options: BannerAdOptions = {
    adId: bannerAdUnitId,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: true, // Remove for production
  };
  try {
    await AdMob.showBanner(options);
  } catch (error) {
    console.error('Show Banner Error', error);
  }
};

export const hideBannerAd = async () => {
  if (!adsInitialized) return;
  try {
    await AdMob.hideBanner();
  } catch (error) {
    console.error('Hide Banner Error', error);
  }
};

export const prepareInterstitialAd = async () => {
  if (isPremiumUser || !adsInitialized) return;
  const options: AdOptions = {
    adId: interstitialAdUnitId,
    isTesting: true, // Remove for production
  };
  try {
    await AdMob.prepareInterstitial(options);
  } catch (error) {
    console.error('Prepare Interstitial Error', error);
  }
};

export const showInterstitialAd = async () => {
  if (isPremiumUser || !adsInitialized) return;
  try {
    await AdMob.showInterstitial();
  } catch (error) {
    console.error('Show Interstitial Error', error);
  }
};

export const purchaseRemoveAds = async (): Promise<boolean> => {
  try {
    const { transaction } = await NativePurchases.purchaseProduct({
      productIdentifier: REMOVE_ADS_PRODUCT_ID,
    });
    
    if (transaction) {
      isPremiumUser = true;
      await hideBannerAd();
      return true;
    }
    return false;
  } catch (error: any) {
    console.error('Purchase error', error);
    // User probably cancelled
    return false;
  }
};
