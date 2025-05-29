import slugify from "slugify";
import categoryModel from "../models/categoryModel.js";

export const createCategoryController = async (req,res) => {
    try {
        const {name} = req.body
        if(!name) return res.status(401).send({message : "name is required"})
        const existingCategory = await categoryModel.findOne({name})
        if(existingCategory) return res.status(200).send({success : true,message : "category already exist"})
        
        const category = await new categoryModel({name,slug : slugify(name)}).save()

        return res.status(201).send({
            success : true,
            message : "category created successfully",
            category

        })
    } catch (error) {
        console.log(error);
        res.stats(500).send({
            success : false,
            error,
            message:"error in category"
        })
    }
}


export const updateCategoryController = async(req,res) => {
    try {
        const {name} = req.body
        const {id} = req.params
        
        const category = await categoryModel.findByIdAndUpdate(
            id,
            {name, slug : slugify(name)},
            {new : true}
        )

        return res.status(200).send({
            success : true,
            message : "category updated successfully",
            category,

        })
    } catch (error) {
        console.log(error);
        res.stats(500).send({
            success : false,
            error,
            message:"error in update category"
        })
    }
}


export const getCategoryController = async (req,res) => {
    try {
        const category = await categoryModel.find({})
        return res.status(200).send({
            success : true,
            message : "category fetched successfully",
            category,

        })
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success : false,
            error,
            message:"error in get category"
        })
    }
}


export const getSingleCategoryController = async (req,res) => {
    try {
        const {slug} = req.params
        const category = await categoryModel.find({slug})
        return res.status(200).send({
            success : true,
            message : "single category fetched successfully",
            category,

        })
    } catch (error) {
        console.log(error);
        res.stats(500).send({
            success : false,
            error,
            message:"error in get single category"
        })
    }
}


export const deleteCategoryController = async (req, res) => {
    try {
      const { id } = req.params;
      await categoryModel.findByIdAndDelete(id);
      res.status(200).send({
        success: true,
        message: "Categry Deleted Successfully",
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        success: false,
        message: "error while deleting category",
        error,
      });
    }
  };
