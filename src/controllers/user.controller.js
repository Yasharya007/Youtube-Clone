import { asyncHandler } from "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser= asyncHandler(async (req,res)=>{
    

    // get user details fromm frontend
    const {fullname,email,username,password}=req.body
    console.log(email);

    // validation - not empty
    if (
        [fullname,email,username,password].some((field)=>
    field?.trim()==="")
    ) {
        throw new Error("All fields are required");
    }

    // check if user is already exists
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){throw new Error("User exist");}

    // check for images, check for avatar
    const avatarLocalPath=req.files?.avatar[0]?.path;
    let coverImageLoacalPath;
    if(req.files && req.files.coverImage){
        coverImageLoacalPath=req.files?.coverImage[0]?.path;
    }
    // const coverImageLoacalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath)throw new Error("Avatar file is req");

    // upload them to cloudinary
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    // let coverImage;
    // console.log(coverImageLoacalPath);
    const coverImage=await uploadOnCloudinary(coverImageLoacalPath)

    
    if(!avatar){
        throw new Error("avatar is required");
    }

     // create user object - create entry in db
     const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url|| "",
        email,
        password,
        username:username.toLowerCase()
     })
     // remove password and refresh token field from response
    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // check for user creation
    if(!createdUser){
        throw new Error("Something went wrong while creating user")
    }

    // return res 
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )

})




// const registerUser=(req,res)=>{
//     res.status(200).json({
//         message:"ok"
//     })
// } 

export {registerUser} 