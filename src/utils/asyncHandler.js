const asyncHandler=(fn)=>async(req,res,next)=>{
    try{
        await fn(req,re,next)
    }catch(err){
        res.status(err.code || 500).json({
            success:false,
            message:err.message
        })
    }
}