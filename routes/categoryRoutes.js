import  express  from 'express';
import { isAdmin, requireSignIn } from './../middleware/authMiddleware.js';
import { createCategoryController, deleteCategoryController, getCategoryController, getSingleCategoryController, updateCategoryController } from './../controller/categoryController.js';

const router = express.Router()


router.post('/create-category',requireSignIn,isAdmin,createCategoryController)
router.put('/update-category/:id',requireSignIn,isAdmin,updateCategoryController)
router.get('/get-category',getCategoryController)
router.get('/single-category/:slug',getSingleCategoryController)
router.delete('/delete-category/:id',requireSignIn,isAdmin,deleteCategoryController)


export default router