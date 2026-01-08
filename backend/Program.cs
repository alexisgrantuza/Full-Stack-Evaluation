using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using TaskManager.Data;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Disable automatic model state validation to handle it manually
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .SelectMany(x => x.Value!.Errors)
                .Select(x => x.ErrorMessage)
                .ToList();

            return new BadRequestObjectResult(new
            {
                message = "Validation failed",
                errors = errors
            });
        };
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS services
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});



builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Enable CORS middleware (must be before MapControllers)
app.UseCors("AllowReactApp");

app.MapControllers();

app.Run();