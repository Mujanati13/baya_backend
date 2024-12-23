const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all promo codes
router.get('/promo-codes', async (req, res) => {
  try {
    const query = `
      SELECT
        ID_PROMO,
        Code,
        Reduction,
        DateDebut,
        DateFin,
        Active,
        productScope,
        categoryScope,
        COALESCE(
            (SELECT JSON_ARRAYAGG(ID_ART)
             FROM promo_product_mapping
             WHERE ID_PROMO = pc.ID_PROMO), '[]'
        ) AS ProductIds,
        COALESCE(
            (SELECT JSON_ARRAYAGG(ID_CAT)
             FROM promo_category_mapping
             WHERE ID_PROMO = pc.ID_PROMO), '[]'
        ) AS CategoryIds
      FROM promo_codes pc
    `;

    const [promoCodes] = await db.promise().query(query);

    promoCodes.forEach(promoCode => {
      promoCode.ProductIds = promoCode.ProductIds && promoCode.ProductIds !== 'null'
          ? JSON.parse(promoCode.ProductIds)
          : [];
      promoCode.CategoryIds = promoCode.CategoryIds && promoCode.CategoryIds !== 'null'
          ? JSON.parse(promoCode.CategoryIds)
          : [];
    });

    res.json(promoCodes);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des codes promo' });
  }
});

// CREATE a new promo code
router.post('/promo-codes', async (req, res) => {
  const {
    Code,
    Reduction,
    DateDebut,
    DateFin,
    Active,
    productScope,
    categoryScope,
    productIds = [],
    categoryIds = []
  } = req.body;

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    // Insert promo code
    const [promoCodeResult] = await connection.query(
        'INSERT INTO promo_codes (Code, Reduction, DateDebut, DateFin, Active) VALUES (?, ?, ?, ?, ?)',
        [Code, Reduction, DateDebut, DateFin, Active]
    );
    const promoCodeId = promoCodeResult.insertId;

    // Handle product mapping only if scope is 'specific'
    if (productScope === 'specific' && productIds.length > 0) {
      const productMappings = productIds.map(productId =>
          [promoCodeId, productId]
      );
      await connection.query(
          'INSERT INTO promo_product_mapping (ID_PROMO, ID_ART) VALUES ?',
          [productMappings]
      );
    }

    // Handle category mapping only if scope is 'specific'
    if (categoryScope === 'specific' && categoryIds.length > 0) {
      const categoryMappings = categoryIds.map(categoryId =>
          [promoCodeId, categoryId]
      );
      await connection.query(
          'INSERT INTO promo_category_mapping (ID_PROMO, ID_CAT) VALUES ?',
          [categoryMappings]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Code promo créé avec succès',
      ID_PROMO: promoCodeId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating promo code:', error);
    res.status(500).json({ message: 'Erreur lors de la création du code promo' });
  } finally {
    connection.release();
  }
});
// UPDATE a promo code
router.put('/promo-codes/:id', async (req, res) => {
  const promoCodeId = req.params.id;
  const {
    Code,
    Reduction,
    DateDebut,
    DateFin,
    Active,
    productScope,
    categoryScope,
    productIds = [],
    categoryIds = []
  } = req.body;

  const connection = await db.promise().getConnection();

  try {
    // Start a transaction
    await connection.beginTransaction();

    // Update promo code details
    await connection.query(
        'UPDATE promo_codes SET Code = ?, Reduction = ?, DateDebut = ?, DateFin = ?, Active = ? WHERE ID_PROMO = ?',
        [Code, Reduction, DateDebut, DateFin, Active, promoCodeId]
    );

    // Remove existing product and category mappings
    await connection.query('DELETE FROM promo_product_mapping WHERE ID_PROMO = ?', [promoCodeId]);
    await connection.query('DELETE FROM promo_category_mapping WHERE ID_PROMO = ?', [promoCodeId]);

    // Handle product mapping
    if (productScope === 'specific' && productIds.length) {
      const productMappings = productIds.map(productId =>
          [promoCodeId, productId]
      );
      await connection.query(
          'INSERT INTO promo_product_mapping (ID_PROMO, ID_ART) VALUES ?',
          [productMappings]
      );
    }

    // Handle category mapping
    if (categoryScope === 'specific' && categoryIds.length) {
      const categoryMappings = categoryIds.map(categoryId =>
          [promoCodeId, categoryId]
      );
      await connection.query(
          'INSERT INTO promo_category_mapping (ID_PROMO, ID_CAT) VALUES ?',
          [categoryMappings]
      );
    }

    // Commit transaction
    await connection.commit();

    res.json({ message: 'Code promo mis à jour avec succès' });
  } catch (error) {
    // Rollback transaction in case of error
    await connection.rollback();
    console.error('Error updating promo code:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du code promo' });
  } finally {
    connection.release();
  }
});

// DELETE a promo code
router.delete('/promo-codes/:id', async (req, res) => {
  const promoCodeId = req.params.id;

  const connection = await db.promise().getConnection();

  try {
    // Start a transaction
    await connection.beginTransaction();

    // Remove product mappings
    await connection.query('DELETE FROM promo_product_mapping WHERE ID_PROMO = ?', [promoCodeId]);

    // Remove category mappings
    await connection.query('DELETE FROM promo_category_mapping WHERE ID_PROMO = ?', [promoCodeId]);

    // Remove promo code
    const [result] = await connection.query('DELETE FROM promo_codes WHERE ID_PROMO = ?', [promoCodeId]);

    // Commit transaction
    await connection.commit();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Code promo non trouvé' });
    }

    res.json({ message: 'Code promo supprimé avec succès' });
  } catch (error) {
    // Rollback transaction in case of error
    await connection.rollback();
    console.error('Error deleting promo code:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du code promo' });
  } finally {
    connection.release();
  }
});


router.post('/validate-promo-code', async (req, res) => {
  const { promoCode, productIds } = req.body;

  if (!promoCode || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      message: 'Code promo et liste de produits requis',
      valid: false
    });
  }

  const connection = await db.promise().getConnection();

  try {
    // First, find the promo code
    const [promoCodes] = await connection.query(
        `SELECT
           ID_PROMO,
           Code,
           Reduction,
           DateDebut,
           DateFin,
           Active,
           COALESCE(
               (SELECT JSON_ARRAYAGG(ID_ART)
                FROM promo_product_mapping
                WHERE ID_PROMO = pc.ID_PROMO), '[]'
           ) AS ProductIds,
           COALESCE(
               (SELECT JSON_ARRAYAGG(ID_CAT)
                FROM promo_category_mapping
                WHERE ID_PROMO = pc.ID_PROMO), '[]'
           ) AS CategoryIds
         FROM promo_codes pc
         WHERE Code = ?`,
        [promoCode]
    );

    // Promo code not found
    if (promoCodes.length === 0) {
      return res.status(404).json({
        message: 'Code promo invalide',
        valid: false
      });
    }

    const promoCodeDetails = promoCodes[0];

    // Check if promo code is active
    if (!promoCodeDetails.Active) {
      return res.status(400).json({
        message: 'Code promo inactif',
        valid: false
      });
    }

    // Check date validity
    const now = new Date();
    const startDate = new Date(promoCodeDetails.DateDebut);
    const endDate = new Date(promoCodeDetails.DateFin);

    if (now < startDate || now > endDate) {
      return res.status(400).json({
        message: 'Code promo expiré ou pas encore valide',
        valid: false
      });
    }

    // Parse product and category mappings
    const mappedProductIds = promoCodeDetails.ProductIds
        ? JSON.parse(promoCodeDetails.ProductIds)
        : [];
    const mappedCategoryIds = promoCodeDetails.CategoryIds
        ? JSON.parse(promoCodeDetails.CategoryIds)
        : [];

    // Check product scope
    let validProductFound = false;

    // If no specific product or category mappings, promo applies to all products
    if (mappedProductIds.length === 0 && mappedCategoryIds.length === 0) {
      validProductFound = true;
    } else {
      // Check if any of the input product IDs match mapped products
      for (const productId of productIds) {
        // Check direct product mapping
        if (mappedProductIds.includes(productId)) {
          validProductFound = true;
          break;
        }

        // Check category mapping
        if (mappedCategoryIds.length > 0) {
          // Fetch product's category
          const [productCategories] = await connection.query(
              'SELECT ID_CAT FROM product_categories WHERE ID_ART = ?',
              [productId]
          );

          if (productCategories.some(cat =>
              mappedCategoryIds.includes(cat.ID_CAT)
          )) {
            validProductFound = true;
            break;
          }
        }
      }
    }

    if (!validProductFound) {
      return res.status(400).json({
        message: 'Code promo non applicable aux produits sélectionnés',
        valid: false
      });
    }

    // Promo code is valid
    res.json({
      message: 'Code promo valide',
      valid: true,
      reduction: promoCodeDetails.Reduction
    });

  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({
      message: 'Erreur lors de la validation du code promo',
      valid: false
    });
  } finally {
    connection.release();
  }
});

module.exports = router;

